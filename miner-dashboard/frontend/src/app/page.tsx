"use client";

import { useState, useEffect } from "react";
import MinerStatus from "./MinerStatus/page";
import DagVisualizer from "./DAGVisualizer/page";

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("miner");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white overflow-hidden">
      {/* Mobile Header with Hamburger */}
      <header className="relative z-10 flex items-center justify-between p-2 md:hidden">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isSidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-primary-400 to-purple-500">
          Braidpool
        </h1>
      </header>

      <div className="flex h-[calc(100vh-48px)] md:h-screen">
        {/* Sidebar Navigation */}
        <div
          className={`fixed inset-y-0 left-0 z-20 bg-gray-900/95 backdrop-blur-md transform transition-all duration-200 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:relative ${
            isSidebarCollapsed ? "md:w-12" : "md:w-56"
          } border-r border-gray-800`}
        >
          <nav className="h-full p-2">
            {/* Collapse Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center w-full p-2 mb-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>

            <div className="space-y-1">
              <button
                className={`w-full px-3 py-2.5 text-left rounded-lg transition-colors flex items-center ${
                  !isSidebarCollapsed ? "space-x-3" : "justify-center"
                } ${
                  activeTab === "miner"
                    ? "bg-primary-500/20 text-primary-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
                onClick={() => handleTabChange("miner")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 min-w-[1.25rem] min-h-[1.25rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!isSidebarCollapsed && <span className="text-base">Miner Stats</span>}
              </button>
              <button
                className={`w-full px-3 py-2.5 text-left rounded-lg transition-colors flex items-center ${
                  !isSidebarCollapsed ? "space-x-3" : "justify-center"
                } ${
                  activeTab === "dag"
                    ? "bg-primary-500/20 text-primary-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
                onClick={() => handleTabChange("dag")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 min-w-[1.25rem] min-h-[1.25rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {!isSidebarCollapsed && <span className="text-base">DAG View</span>}
              </button>
            </div>
          </nav>
        </div>

        {/* Main content */}
        <main className={`flex-1 p-2 overflow-auto transition-all duration-200 ${
          isSidebarCollapsed ? "md:ml-8" : "md:ml-0"
        }`}>
          <div className="glass h-full">
            {activeTab === "miner" && <MinerStatus />}
            {activeTab === "dag" && <DagVisualizer />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-gray-400 text-xs py-1">
        <p>Braidpool Dashboard v0.1 — Connected to node</p>
      </footer>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Add custom animation classes to global.css */}
      <style jsx global>{`
        .glass {
          background: rgba(17, 25, 40, 0.75);
          backdrop-filter: blur(4px);
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.125);
        }
      `}</style>
    </div>
  );
}
