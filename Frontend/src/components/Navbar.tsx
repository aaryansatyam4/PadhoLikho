import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, LogOut, LayoutDashboard, User, Bell } from 'lucide-react';
import Cookies from 'js-cookie';
import { Button } from './ui/Button';
import { logout, getNotifications, clearNotifications, searchUsers } from '../lib/api';

interface NavbarProps {
  onNewPost?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNewPost }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{ id: number; username: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const userId = Cookies.get('userId');

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return;
      try {
        const data = await getNotifications(userId);
        // Format notifications based on type
        const formattedNotifications = data.map((notif: any) => {
          if (notif.type === 'follow') {
            return {
              id: notif.id,
              message: `${notif.actor_name} started following you`,
            };
          } else if (notif.type === 'comment') {
            return {
              id: notif.id,
              message: `${notif.actor_name} commented on your post "${notif.blog_title}"`,
            };
          }
          return notif;
        });
        setNotifications(formattedNotifications);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    fetchNotifications();
  }, [userId]);

  // Handle dropdown click outside
  useEffect(() => {
    const handleClickOutside = async (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (showDropdown && userId) {
          await clearNotifications(userId); // delete from DB
          setNotifications([]);
        }
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, userId]);

  const handleLogout = async () => {
    await logout(); 
    navigate("/login"); 
  };


  // Search users while typing
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.length > 1) {
        try {
          const users = await searchUsers(searchTerm);
          setSearchSuggestions(users);
        } catch (error) {
          console.error('Failed to fetch search suggestions:', error);
        }
      } else {
        setSearchSuggestions([]);
      }
    }, 300); // debounce time of 300ms

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-blue-600 cursor-pointer"
          >
            PadhoLikho
          </div>

          <div className="flex items-center space-x-4 relative">
            {/* Search Bar */}
            <div className="relative w-60 hidden sm:block">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search profiles..."
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {searchSuggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-md text-sm">
                  {searchSuggestions.map((user) => (
                    <li
                      key={user.id}
                      onClick={() => {
                        navigate(`/profile/${user.id}`);
                        setSearchTerm('');
                        setSearchSuggestions([]);
                      }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {user.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <Button variant="ghost" onClick={() => setShowDropdown(!showDropdown)}>
                <Bell className="h-5 w-5 text-gray-700" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {notifications.length}
                  </span>
                )}
              </Button>

              {showDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border shadow-lg rounded-md z-50 animate-fadeIn"
                >
                  <div className="p-2 font-medium border-b text-gray-700">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No new notifications</div>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto">
                      {notifications.map((notif) => (
                        <li key={notif.id} className="px-4 py-2 text-sm text-gray-800 hover:bg-gray-100">
                          {notif.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {onNewPost && (
              <Button
                onClick={onNewPost}
                className="flex items-center bg-blue-000 text-white hover:bg-blue-500"
              >
                <PenSquare className="h-4 w-4 mr-2" />
                New Post
              </Button>
            )}
            <Button
              onClick={() => navigate('/dashboard')}
              className="flex items-center bg-blue-000 text-white hover:bg-blue-500"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              onClick={() => navigate('/profile')}
              className="flex items-center bg-blue-000 text-white hover:bg-blue-500"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
             
              className="flex items-center text-gray-000 hover:bg-gray-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }
      `}</style>
    </nav>
  );
};
