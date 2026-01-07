import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  House,
  LogOut,
  CheckSquare,
  Shield,
  NotebookText,
  Handshake,
  ClipboardList,
  Waypoints,
  Microscope,
  Menu,
  X,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/AuthStore";
import Avatar from "../../assets/Avatar.png";

function Navbar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { role, logout, email, name, profilePicture } = useAuthStore(); // Get role, logout, email, name, and profilePicture from the store

  // Detect screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);

      // Auto-close mobile menu if switching to desktop
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Add/remove body class when mobile menu opens/closes
  useEffect(() => {
    if (isMobile) {
      if (mobileMenuOpen) {
        document.body.classList.add("mobile-menu-open");
      } else {
        document.body.classList.remove("mobile-menu-open");
      }
    } else {
      document.body.classList.remove("mobile-menu-open");
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove("mobile-menu-open");
    };
  }, [mobileMenuOpen, isMobile]);
  // Define menu items for each role
  const menuItemsByRole = {
    user: [
      { name: "Home", icon: <House size={20} />, path: "/" },
      { name: "Entries", icon: <NotebookText size={20} />, path: "/entries" },
      { name: "Assignments", icon: <Handshake size={20} />, path: "/assigned" },
      { name: "Refer Others", icon: <Waypoints size={20} />, path: "/refer" },
    ],
    cata: [
      { name: "Home", icon: <House size={20} />, path: "/" },
      {
        name: "Verify Records",
        icon: <CheckSquare size={20} />,
        path: "/verify-records",
      },
      { name: "Tasks", icon: <NotebookText size={20} />, path: "/tasks" },
      { name: "Refer Others", icon: <Waypoints size={20} />, path: "/refer" },
    ],
    catb: [
      { name: "Home", icon: <House size={20} />, path: "/" },
      {
        name: "Verify Records",
        icon: <CheckSquare size={20} />,
        path: "/verify-records",
      },
      { name: "Tasks", icon: <NotebookText size={20} />, path: "/tasks" },
      { name: "Refer Others", icon: <Waypoints size={20} />, path: "/refer" },
    ],
    catc: [
      { name: "Home", icon: <House size={20} />, path: "/" },
      {
        name: "Verify Records",
        icon: <CheckSquare size={20} />,
        path: "/verify-records",
      },
      { name: "Tasks", icon: <NotebookText size={20} />, path: "/tasks" },
      { name: "Refer Others", icon: <Waypoints size={20} />, path: "/refer" },
    ],
    admin: [
      { name: "Admin Panel", icon: <Shield size={20} />, path: "/" },
      {
        name: "Task Assignments",
        icon: <ClipboardList size={20} />,
        path: "/task-assignments",
      },
      {
        name: "Records",
        icon: <NotebookText size={20} />,
        path: "/all-entries",
      },
      { name: "Analysis", icon: <Microscope size={20} />, path: "/analysis" },
      { name: "Refer Others", icon: <Waypoints size={20} />, path: "/refer" },
    ],
  };

  // Get the menu items for the current role
  const currentMenuItems = menuItemsByRole[role] || [];

  const handleLogout = async () => {
    try {
      await logout(); // This will call the backend logout and clear cookies
      navigate("/login");
    } catch (error) {
      // console.error("Logout failed:", error);
      // Navigate to login anyway
      navigate("/login");
    }
  };

  const menuTopItems = useMemo(() => menuItemsByRole[role] || [], [role]);

  const menuBottomItems = [
    { name: "Logout", icon: <LogOut size={20} />, action: handleLogout },
  ];

  const isActive = (path) => pathname === path;

  // Don't render the navbar if there's no role (i.e., user is not logged in)
  if (!role) {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed z-[60] p-2 md:hidden"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X size={22} className="text-gray-700" />
          ) : (
            <Menu size={22} className="text-gray-700" />
          )}
        </button>
      )}

      {/* Backdrop overlay for mobile */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${
            isMobile
              ? `fixed left-0 top-0 z-40 h-full bg-gray-50 border-r border-gray-200 ${
                  mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                } w-64 shadow-lg flex flex-col`
              : `h-screen bg-gray-50 border-r border-gray-200 flex flex-col ${
                  collapsed ? "w-20 shadow-sm" : "w-58 shadow-md"
                }`
          }
        `}
      >
        {/* Header with toggle - Hide collapse button on mobile */}
        <div className="flex items-center justify-between p-4 ml-1.5">
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`p-2 rounded-md hover:bg-gray-100`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="inline-block">
                {collapsed ? (
                  <ChevronRight size={20} />
                ) : (
                  <ChevronLeft size={20} />
                )}
              </span>
            </button>
          )}
        </div>
        <hr className="border-0 border-t border-gray-300 mx-4 opacity-60" />

        {/* User Profile Section - Mobile Only */}
        {isMobile && (
          <>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <img
                  src={profilePicture || Avatar}
                  alt="user profile"
                  className="w-12 h-12 rounded-full object-cover shadow-sm"
                  onError={(e) => {
                    e.target.src = Avatar; // Fallback to default avatar if Google image fails
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800 break-words">
                    {name || email || "User"}
                  </p>
                  <p className="text-xs text-gray-500">Welcome back!</p>
                </div>
              </div>
            </div>
            <hr className="border-0 border-t border-gray-300 mx-4 opacity-60" />
          </>
        )}

        {/* Top Menu Items */}
        <div className="p-4 flex-1">
          <div className="space-y-3">
            {currentMenuItems.map((menuItem, index) => {
              const active = isActive(menuItem.path);
              return (
                <div key={index}>
                  <button
                    className={`w-full flex items-center gap-3 p-3 rounded-sm text-left group overflow-hidden
                                        ${
                                          active
                                            ? "bg-[#4071f4]"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                        }`}
                    title={!isMobile && collapsed ? menuItem.name : undefined}
                    onClick={() => navigate(menuItem.path)}
                  >
                    <span
                      className={`flex-shrink-0 ${
                        !isMobile && collapsed ? "pl-0.5" : "pl-2"
                      } ${
                        active
                          ? "text-white"
                          : "text-gray-500 group-hover:text-gray-700"
                      }`}
                    >
                      {menuItem.icon}
                    </span>
                    <span
                      className={`font-medium whitespace-nowrap ${
                        !isMobile && collapsed
                          ? "opacity-0 w-0 ml-0"
                          : "opacity-100 w-auto ml-1"
                      } ${
                        active
                          ? "text-white"
                          : "text-gray-500 group-hover:text-gray-700"
                      }`}
                    >
                      {menuItem.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-0 border-t border-gray-300 mx-4 opacity-60" />

        {/* Bottom Menu Items */}
        <div className="p-4 mt-auto">
          <div className="space-y-2">
            {menuBottomItems.map((menuItem, index) => {
              const active = isActive(menuItem.path);
              return (
                <div key={index}>
                  <button
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left group overflow-hidden
                                        ${
                                          active
                                            ? "bg-red-50 text-red-700 border border-red-200"
                                            : "hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                    title={!isMobile && collapsed ? menuItem.name : undefined}
                    onClick={menuItem.action}
                  >
                    <span
                      className={`flex-shrink-0 ${
                        !isMobile && collapsed ? "pl-0.5" : "pl-2"
                      } text-[#787878] ${
                        active ? "text-red-700" : "text-gray-500"
                      }`}
                    >
                      {menuItem.icon}
                    </span>
                    <span
                      className={`font-medium text-[#787878] whitespace-nowrap ${
                        !isMobile && collapsed
                          ? "opacity-0 w-0 ml-0"
                          : "opacity-100 w-auto ml-1"
                      }`}
                    >
                      {menuItem.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
