import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from 'axios';
import db from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET; 

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

app.use(cors());
app.use(express.json()); // Allows JSON request bodies

// ✅ Sign Up API (Register New User)
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const [result] = await db.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);

        res.status(201).json({ message: "User registered successfully", userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (user.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        // Compare password
        const isValid = await bcrypt.compare(password, user[0].password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Generate JWT token with username
        const token = jwt.sign(
            { id: user[0].id, username: user[0].username, email: user[0].email }, 
            JWT_SECRET, 
            { expiresIn: "1h" }
        );

        res.json({ token, user: { id: user[0].id, username: user[0].username, email: user[0].email } });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Protected Route (Example)
app.get("/profile", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ message: "Access granted!", userId: decoded.id });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});

// ✅ Add a New Category
app.post("/addCategory", async (req, res) => {
    const { name } = req.body;

    try {
        const [result] = await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
        res.status(201).json({ categoryId: result.insertId, message: "Category added successfully" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Add a New Post
app.post("/addPost", async (req, res) => {
    const { user_id, title, content, category_id } = req.body;

    try {
        await db.query(
            "INSERT INTO posts (user_id, title, content, category_id) VALUES (?, ?, ?, ?)", 
            [user_id, title, content, category_id]
        );
        res.status(201).json({ message: "Post added successfully" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/addBlog", async (req, res) => {
    const { user_id, title, content, category_id } = req.body;

    try {
        const [result] = await db.query(
            "INSERT INTO posts (user_id, title, content, category_id) VALUES (?, ?, ?, ?)",
            [user_id, title, content, category_id]
        );

        res.status(201).json({ message: "Blog post added successfully", postId: result.insertId });
    } catch (error) {
        console.error("Error adding blog post:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/getBlogs", async (req, res) => {
    try {
        const [posts] = await db.query(`
            SELECT 
                posts.id, 
                posts.title, 
                posts.content, 
                posts.created_at, 
                posts.category_id,           -- ✅ ADD THIS
                users.username, 
                categories.name AS category_name  -- ✅ Rename for clarity
            FROM posts 
            JOIN users ON posts.user_id = users.id 
            LEFT JOIN categories ON posts.category_id = categories.id
            ORDER BY posts.created_at DESC
        `);

        res.json(posts);
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/getCategories", async (req, res) => {
    try {
        const [categories] = await db.query("SELECT * FROM categories");
        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Server error" });
    }
});
app.get("/getBlog/:id", async (req, res) => {
    const { id } = req.params;
  
    try {
      const [post] = await db.query(`
        SELECT 
          posts.id, 
          posts.title, 
          posts.content, 
          posts.created_at, 
          posts.user_id, 
          users.username, 
          categories.name AS category_name
        FROM posts
        JOIN users ON posts.user_id = users.id
        LEFT JOIN categories ON posts.category_id = categories.id
        WHERE posts.id = ?
      `, [id]);
  
      if (post.length === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }
  
      res.json(post[0]);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  

// ✅ Add a New Comment
app.post("/addComment", async (req, res) => {
  const { post_id, user_id, content } = req.body;

  if (!post_id || !user_id || !content) {
      return res.status(400).json({ error: "All fields are required" });
  }

  try {
      const [result] = await db.query(
          "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)", 
          [post_id, user_id, content]
      );

      // Corrected: use post_id instead of postId
      const [post] = await db.query('SELECT user_id FROM posts WHERE id = ?', [post_id]);

      // Send notification if the comment is added by a user who is not the owner of the post
      if (post && post[0].user_id !== user_id) {
          await db.query(
              'INSERT INTO notifications (user_id, type, actor_id, blog_id) VALUES (?, "comment", ?, ?)',
              [post[0].user_id, user_id, post_id]
          );
      }

      res.status(201).json({ message: "Comment added successfully", commentId: result.insertId });
  } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Server error" });
  }
});


// ✅ Get Comments for a Post
app.get("/getComments/:post_id", async (req, res) => {
    const { post_id } = req.params;

    try {
        const [comments] = await db.query(`
            SELECT comments.id, comments.content, comments.created_at, 
                   users.username 
            FROM comments 
            JOIN users ON comments.user_id = users.id 
            WHERE comments.post_id = ?
            ORDER BY comments.created_at ASC
        `, [post_id]);

        res.json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Server error" });
    }
});




app.put("/updateBlog/:id", async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
  
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
  
    try {
      const [result] = await db.query(
        "UPDATE posts SET title = ?, content = ? WHERE id = ?",
        [title, content, id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }
  
      res.json({ message: "Blog post updated successfully" });
    } catch (error) {
      console.error("Error updating blog:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  



  app.get('/github/login', (req, res) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=user`;
    res.redirect(redirectUri);
  });
  app.get('/github/callback', async (req, res) => {
    const code = req.query.code;
  
    try {
      // Step 1: Get access token
      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        },
        { headers: { Accept: 'application/json' } }
      );
  
      const accessToken = tokenRes.data.access_token;
  
      // Step 2: Fetch GitHub user profile
      const userRes = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
  
      const emailRes = await axios.get(`https://api.github.com/user/emails`, {
        headers: { Authorization: `token ${accessToken}` },
      });
  
      const user = userRes.data;
      const email = emailRes.data.find(e => e.primary && e.verified)?.email;
  
      // Step 3: Check if user exists in DB
      const [existing] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
  
      let userId;
  
      if (existing.length > 0) {
        userId = existing[0].id;
      } else {
        const [insertResult] = await db.query(
          `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
          [user.login, email, 'github_sso']
        );
        userId = insertResult.insertId;
      }
  
      // Step 4: Generate JWT
      const token = jwt.sign({ id: userId, username: user.login, email }, JWT_SECRET, {
        expiresIn: '1h',
      });

      res.redirect(`http://localhost:5173/github/callback?token=${token}&id=${userId}&name=${user.login}`);


    } catch (err) {
      console.error('GitHub SSO Error:', err);
      res.status(500).send('GitHub Login Failed');
    }
  });

  app.get("/user/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [user] = await db.query(
            "SELECT id, username, email, created_at FROM users WHERE id = ?",
            [id]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user[0]);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Server error" });
    }
});
app.put("/user/:id", async (req, res) => {
  const { id } = req.params;
  const { username, email, currentPassword, newPassword } = req.body;

  if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required" });
  }

  try {
      // Check for email conflict with other users
      const [existing] = await db.query(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [email, id]
      );
      if (existing.length > 0) {
          return res.status(400).json({ error: "Email already in use by another user" });
      }

      // Get current user for password validation
      const [userRows] = await db.query(
          "SELECT password FROM users WHERE id = ?",
          [id]
      );

      if (userRows.length === 0) {
          return res.status(404).json({ error: "User not found" });
      }

      // If password change requested
      if (currentPassword && newPassword) {
          const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
          if (!isMatch) {
              return res.status(401).json({ error: "Current password is incorrect" });
          }

          const hashedNewPassword = await bcrypt.hash(newPassword, 10);
          await db.query(
              "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?",
              [username, email, hashedNewPassword, id]
          );
      } else {
          // Update without password
          await db.query(
              "UPDATE users SET username = ?, email = ? WHERE id = ?",
              [username, email, id]
          );
      }

      res.json({ message: "Profile updated successfully" });
  } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Server error" });
  }
});

app.get("/getUserBlogs/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
      const [posts] = await db.query(
          `
          SELECT 
              posts.id, 
              posts.title, 
              posts.content, 
              posts.created_at, 
              posts.category_id,
              users.username,
              categories.name AS category_name
          FROM posts
          JOIN users ON posts.user_id = users.id
          LEFT JOIN categories ON posts.category_id = categories.id
          WHERE posts.user_id = ?
          ORDER BY posts.created_at DESC
          `,
          [userId]
      );

      res.json(posts);
  } catch (error) {
      console.error("Error fetching user blogs:", error);
      res.status(500).json({ error: "Server error" });
  }
});


// 🔍 Search users by username (partial match)
app.get("/searchUsers", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query required" });

  try {
    const [results] = await db.query(
      "SELECT id, username FROM users WHERE username LIKE ? LIMIT 10",
      [`%${q}%`]
    );
    res.json(results);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/follow', async (req, res) => {
  const { followerId, followingId } = req.body;

  if (!followerId || !followingId || followerId === followingId) {
    return res.status(400).json({ error: "Invalid follow request" });
  }

  try {
    await db.query(
      "INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)",
      [followerId, followingId]
    );

    await db.query(
      'INSERT INTO notifications (user_id, type, actor_id) VALUES (?, "follow", ?)',
      [followingId, followerId]
    );
    


    res.json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/unfollow', async (req, res) => {
  const { followerId, followingId } = req.body;

  if (!followerId || !followingId) {
    return res.status(400).json({ error: "Invalid unfollow request" });
  }

  try {
    await db.query(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
      [followerId, followingId]
    );
    res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/followers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/following/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching following list:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// POST /bookmark
app.post('/bookmark', async (req, res) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
    return res.status(400).json({ error: 'User ID and Post ID are required' });
  }

  try {
    await db.query(
      'INSERT IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)',
      [user_id, post_id]
    );
    res.status(201).json({ message: 'Bookmark added successfully' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /bookmark
app.delete('/bookmark', async (req, res) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
    return res.status(400).json({ error: 'User ID and Post ID are required' });
  }

  try {
    await db.query(
      'DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );
    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /bookmarks/:userId
app.get('/bookmarks/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [bookmarks] = await db.query(`
      SELECT 
        posts.id,
        posts.title,
        posts.created_at,
        posts.category_id,
        categories.name AS category_name,
        users.username
      FROM bookmarks
      JOIN posts ON bookmarks.post_id = posts.id
      JOIN users ON posts.user_id = users.id
      LEFT JOIN categories ON posts.category_id = categories.id
      WHERE bookmarks.user_id = ?
      ORDER BY bookmarks.created_at DESC
    `, [userId]);

    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const [notifications] = await db.query(`
    SELECT n.*, u.username AS actor_name, p.title AS blog_title
    FROM notifications n
    LEFT JOIN users u ON n.actor_id = u.id
    LEFT JOIN posts p ON n.blog_id = p.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
  `, [userId]);

  res.json(notifications);
});

app.delete('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
    res.status(200).json({ message: 'Notifications cleared.' });
  } catch (err) {
    console.error('Error deleting notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /like
app.post('/like', async (req, res) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
      return res.status(400).json({ error: "user_id and post_id are required" });
  }

  try {
      // Insert a new like
      await db.query("INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)", [user_id, post_id]);

      res.status(200).json({ message: "Post liked successfully" });
  } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ error: "Server error" });
  }
});
// DELETE /unlike
app.delete('/unlike', async (req, res) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
      return res.status(400).json({ error: "user_id and post_id are required" });
  }

  try {
      // Remove the like
      await db.query("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [user_id, post_id]);

      res.status(200).json({ message: "Post unliked successfully" });
  } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ error: "Server error" });
  }
});

app.get('/getLikes/:postId', async (req, res) => {
  const postId = req.params.postId;
  try {
    const [rows] = await db.query(
      'SELECT user_id FROM likes WHERE post_id = ?',
      [postId]
    );
    const count = rows.length;
    const users = rows.map(row => row.user_id);
    res.json({ count, users });
  } catch (err) {
    console.error('Failed to fetch likes:', err);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});



app.get('/getUserLikes/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
      const [likedPosts] = await db.query(
          `SELECT p.id, p.title FROM posts p 
           JOIN likes l ON p.id = l.post_id 
           WHERE l.user_id = ?`, 
          [user_id]
      );
      res.json(likedPosts);
  } catch (error) {
      console.error("Error fetching liked posts:", error);
      res.status(500).json({ error: "Server error" });
  }
});




// ✅ Start the Server
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
