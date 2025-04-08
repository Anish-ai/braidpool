"use client";

import { useEffect, useState } from "react";
import React from "react";

// Simple interface for test braids metadata
interface TestBraid {
  name: string;
  filename: string;
}

// Simple interface for DAG data
interface DAGData {
  description: string;
  parents: Record<string, string[]>;
  cohorts: string[][];
  bead_work?: Record<string, number>;
  work?: Record<string, number>;
  highest_work_path: string[];
  [key: string]: any;
}

export default function DagVisualizer2() {
  // State to store the list of available test braids
  const [testBraids, setTestBraids] = useState<TestBraid[]>([]);
  // State to store the selected braid
  const [selectedBraid, setSelectedBraid] = useState<string>("");
  // State to track loading
  const [loading, setLoading] = useState<boolean>(false);
  // State to store the current DAG data
  const [dagData, setDagData] = useState<DAGData | null>(null);

  // Fetch the list of available test braids
  useEffect(() => {
    const fetchTestBraids = async () => {
      try {
        console.log("Fetching list of test braids...");
        const response = await fetch("http://localhost:5000/api/test-braids");
        const data = await response.json();
        console.log("Available test braids:", data);
        setTestBraids(data);
        
        // Auto-select first braid
        if (data.length > 0) {
          console.log("Auto-selecting first braid:", data[0].filename);
          setSelectedBraid(data[0].filename);
        }
      } catch (err) {
        console.error("Failed to fetch test braids:", err);
      }
    };
    
    fetchTestBraids();
  }, []);

  // Fetch the selected braid data
  useEffect(() => {
    if (!selectedBraid) return;

    const fetchBraidData = async () => {
      try {
        console.log("Fetching data for braid:", selectedBraid);
        setLoading(true);
        
        const response = await fetch(`http://localhost:5000/api/test-braids/${selectedBraid}`);
        const data: DAGData = await response.json();
        
        console.log("Braid description:", data.description);
        console.log("Number of nodes:", Object.keys(data.parents).length);
        console.log("Number of cohorts:", data.cohorts.length);
        console.log("Highest work path length:", data.highest_work_path.length);
        console.log("Highest work path:", data.highest_work_path);
        console.log("Raw data from API:", data);
        
        setDagData(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch braid data:", err);
        setLoading(false);
      }
    };

    fetchBraidData();
  }, [selectedBraid]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          DAG Visualizer 2
        </h1>
        <p className="mt-2 text-gray-400">
          Interactive visualization of the Directed Acyclic Graph (DAG) structure
        </p>
      </div>

      {/* Controls Section */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Braid Selection */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">Select Braid</label>
            <select
              value={selectedBraid}
              onChange={(e) => setSelectedBraid(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a braid</option>
              {testBraids.map((braid) => (
                <option key={braid.filename} value={braid.filename}>
                  {braid.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Data Display */}
      {!loading && dagData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-2">
              <p><span className="text-gray-400">Description:</span> {dagData.description}</p>
              <p><span className="text-gray-400">Total Nodes:</span> {Object.keys(dagData.parents).length}</p>
              <p><span className="text-gray-400">Total Cohorts:</span> {dagData.cohorts.length}</p>
              <p><span className="text-gray-400">Critical Path Length:</span> {dagData.highest_work_path.length}</p>
            </div>
          </div>

          {/* Critical Path */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Critical Path</h2>
            <div className="space-y-2">
              {dagData.highest_work_path.map((nodeId, index) => (
                <div key={nodeId} className="flex items-center">
                  <span className="text-gray-400 w-8">{index + 1}.</span>
                  <span className="bg-blue-500/20 px-2 py-1 rounded">{nodeId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 