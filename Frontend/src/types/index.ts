export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  category_name: string;
  username: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  username: string;
  content: string;
  created_at: string;
}