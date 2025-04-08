"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  bead_work?: Record<string, number>; // Node ID to work value mapping (all 1's)
  work?: Record<string, number>; // Node ID to work value mapping
  highest_work_path: string[];
  [key: string]: any; // Allow for any additional properties that might be in the JSON
}

// Interface for work path analysis
interface WorkPathAnalysis {
  isStrictlyDecreasing: boolean;
  anomalies: {index: number, type: 'increase' | 'plateau'}[];
}

// Interface for cohort transition analysis
interface CohortTransitionAnalysis {
  transitions: {
    fromNode: string;
    fromCohort: number;
    toNode: string;
    toCohort: number;
    isValid: boolean;
    type: 'same' | 'next' | 'backward' | 'leap';
  }[];
}

// Interface for cohort column grouping
interface CohortColumns {
  maxCohort: number;
  columns: Record<number, string[]>;
}

// Interface for node coordinates
interface NodeCoordinates {
  [nodeId: string]: {x: number, y: number};
}

export default function DagVisualizer() {
  // State to store the list of available test braids
  const [testBraids, setTestBraids] = useState<TestBraid[]>([]);
  // State to store the selected braid
  const [selectedBraid, setSelectedBraid] = useState<string>("");
  // State to track loading
  const [loading, setLoading] = useState<boolean>(false);
  // State to store the current DAG data
  const [dagData, setDagData] = useState<DAGData | null>(null);
  // State to store number of parents for each node
  const [parentsCount, setParentsCount] = useState<Record<string, number>>({});
  // State to store work path analysis
  const [workPathAnalysis, setWorkPathAnalysis] = useState<WorkPathAnalysis | null>(null);
  // State to store cohort transition analysis
  const [cohortAnalysis, setCohortAnalysis] = useState<CohortTransitionAnalysis | null>(null);
  // State to store cohort column grouping
  const [cohortColumns, setCohortColumns] = useState<CohortColumns | null>(null);
  // State to store node coordinates
  const [nodeCoordinates, setNodeCoordinates] = useState<NodeCoordinates | null>(null);
  // State to store JSON structure info
  const [jsonStructure, setJsonStructure] = useState<string>("");
  // State to store non-critical nodes
  const [nonCriticalNodes, setNonCriticalNodes] = useState<{[cohort: number]: string[]}>({});
  // Add zoom state near other state variables
  const [scale, setScale] = useState(2.5);
  const [transformX, setTransformX] = useState(-100);
  const [transformY, setTransformY] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Store random offsets for each connection to keep them consistent when hovering
  const [connectionOffsets] = useState<Map<string, number>>(new Map());
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  // Add state for the node notification
  const [nodeNotification, setNodeNotification] = useState<{
    visible: boolean;
    nodeId: string;
    cohort: number;
    work: number;
    connections: number;
    connectionDetails: string[];  // Array of parent node IDs
    timestamp: number;
  } | null>(null);
  
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
        
        // Log structure of the JSON data
        console.log("JSON Data Structure:", Object.keys(data));
        const structureInfo = `JSON Properties: ${Object.keys(data).join(', ')}`;
        
        // Check work object
        if (data.work) {
          console.log("Work object found:", data.work);
          console.log("Work object type:", typeof data.work);
        } else {
          console.log("No 'work' object found");
        }
        
        // Check bead_work object
        if (data.bead_work) {
          console.log("Bead work object found:", data.bead_work);
        }
        
        console.log("Braid description:", data.description);
        console.log("Number of nodes:", Object.keys(data.parents).length);
        console.log("Number of cohorts:", data.cohorts.length);
        console.log("Highest work path length:", data.highest_work_path.length);
        console.log("Highest work path:", data.highest_work_path);
        console.log("Raw data from API:", data);

        // Calculate number of parents for each node
        const nodeParentsCount: Record<string, number> = {};
        Object.keys(data.parents).forEach(nodeId => {
          const parents = data.parents[nodeId] || [];
          nodeParentsCount[nodeId] = parents.length;
        });

        setParentsCount(nodeParentsCount);
        
        
        setJsonStructure(structureInfo);
        setDagData(data);
        analyzeWorkPath(data);
        analyzeCohortTransitions(data);
        organizeCohortColumns(data);
        
        // Identify non-critical nodes and then calculate coordinates
        const nonCriticalByCohort = identifyNonCriticalNodes(data);
        setNonCriticalNodes(nonCriticalByCohort);
        calculateNodeCoordinates(data, nonCriticalByCohort);
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch braid data:", err);
        setLoading(false);
      }
    };

    fetchBraidData();
  }, [selectedBraid]);

  // Log dagData whenever it changes
  useEffect(() => {
    if (dagData) {
      console.log("Current dagData state:", dagData);
    }
  }, [dagData]);

  // Analyze work values in the highest work path
  const analyzeWorkPath = (data: DAGData) => {
    if (!data?.highest_work_path || data.highest_work_path.length === 0) {
      setWorkPathAnalysis(null);
      return;
    }

    const path = data.highest_work_path;
    let workValues: number[] = [];
    
    // Get work values from 'work' object (not array)
    if (data.work && typeof data.work === 'object') {
      console.log("Using 'work' object for work values");
      workValues = path.map(nodeId => {
        const workValue = data.work?.[nodeId] || 0;
        console.log(`Node ${nodeId} work value: ${workValue}`);
        return workValue;
      });
    } 
    // Fallback to bead_work if available
    else if (data.bead_work && typeof data.bead_work === 'object') {
      console.log("Using 'bead_work' object for work values");
      workValues = path.map(nodeId => {
        const workValue = data.bead_work?.[nodeId] || 0;
        console.log(`Node ${nodeId} work value (from bead_work): ${workValue}`);
        return workValue;
      });
    } else {
      console.warn("No work values found in data");
      workValues = path.map(() => 0);
    }
    
    // Check if work values strictly decrease
    const anomalies: {index: number, type: 'increase' | 'plateau'}[] = [];
    
    for (let i = 1; i < workValues.length; i++) {
      const prevWork = workValues[i-1];
      const currentWork = workValues[i];
      
      if (currentWork > prevWork) {
        anomalies.push({ index: i, type: 'increase' });
      } else if (currentWork === prevWork) {
        anomalies.push({ index: i, type: 'plateau' });
      }
    }
    
    setWorkPathAnalysis({
      isStrictlyDecreasing: anomalies.length === 0,
      anomalies
    });
  };

  // Analyze cohort transitions in the highest work path
  const analyzeCohortTransitions = (data: DAGData) => {
    if (!data?.highest_work_path || !data.cohorts || data.highest_work_path.length <= 1) {
      setCohortAnalysis(null);
      return;
    }

    const path = data.highest_work_path;
    const transitions: CohortTransitionAnalysis['transitions'] = [];
    
    // Create a map of node ID to its cohort
    const nodeCohortMap: Record<string, number> = {};
    data.cohorts.forEach((cohort, cohortIndex) => {
      cohort.forEach(nodeId => {
        nodeCohortMap[nodeId] = cohortIndex;
      });
    });
    
    // Analyze transitions between consecutive nodes
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = path[i];
      const toNode = path[i+1];
      const fromCohort = nodeCohortMap[fromNode];
      const toCohort = nodeCohortMap[toNode];
      
      let type: 'same' | 'next' | 'backward' | 'leap' = 'same';
      let isValid = true;
      
      if (fromCohort === toCohort) {
        type = 'same';
      } else if (toCohort === fromCohort + 1) {
        type = 'next';
      } else if (toCohort < fromCohort) {
        type = 'backward';
        isValid = false;
      } else if (toCohort > fromCohort + 1) {
        type = 'leap';
        isValid = false;
      }
      
      transitions.push({
        fromNode,
        fromCohort,
        toNode,
        toCohort,
        isValid,
        type
      });
    }
    
    setCohortAnalysis({ transitions });
  };

  // Organize critical path nodes into cohort columns
  const organizeCohortColumns = (data: DAGData) => {
    if (!data?.highest_work_path || !data.cohorts) {
      setCohortColumns(null);
      return;
    }

    const path = data.highest_work_path;
    const columns: Record<number, string[]> = {};
    let maxCohort = 0;
    
    // Create a map of node ID to its cohort
    const nodeCohortMap: Record<string, number> = {};
    data.cohorts.forEach((cohort, cohortIndex) => {
      cohort.forEach(nodeId => {
        nodeCohortMap[nodeId] = cohortIndex;
        maxCohort = Math.max(maxCohort, cohortIndex);
      });
    });
    
    // Group nodes by cohort
    path.forEach(nodeId => {
      const cohortNum = nodeCohortMap[nodeId];
      if (!columns[cohortNum]) {
        columns[cohortNum] = [];
      }
      columns[cohortNum].push(nodeId);
    });
    
    setCohortColumns({ maxCohort, columns });
  };

  // Identify non-critical nodes by cohort
  const identifyNonCriticalNodes = (data: DAGData): {[cohort: number]: string[]} => {
    if (!data?.highest_work_path || !data.cohorts) {
      return {};
    }

    const criticalPath = new Set(data.highest_work_path);
    const nonCriticalByCohort: {[cohort: number]: string[]} = {};
    
    // Iterate through cohorts to find non-critical nodes
    data.cohorts.forEach((cohortNodes, cohortIndex) => {
      const nonCritical = cohortNodes.filter(nodeId => !criticalPath.has(nodeId));
      
      if (nonCritical.length > 0) {
        nonCriticalByCohort[cohortIndex] = nonCritical;
      }
    });
    
    console.log("Non-critical nodes by cohort:", nonCriticalByCohort);
    return nonCriticalByCohort;
  };

  // Calculate x,y coordinates for each node
  const calculateNodeCoordinates = (data: DAGData, nonCriticalByCohort: {[cohort: number]: string[]}) => {
    if (!data?.highest_work_path || !data.cohorts) {
      setNodeCoordinates(null);
      return;
    }

    // First identify nodes with high connectivity (≥3 connections)
    const highConnectionNodes: Record<string, {
      connections: string[],
      cohort: number
    }> = {};
    
    // Get connections for a node
    const getConnectionsForNode = (nodeId: string): string[] => {
      const parents = data.parents[nodeId] || [];
      const children: string[] = [];
      
      Object.entries(data.parents).forEach(([childId, parentIds]) => {
        if (parentIds.includes(nodeId)) {
          children.push(childId);
        }
      });
      
      return [...parents, ...children];
    };
    
    // Check all nodes and find those with 3+ connections
    Object.keys(data.parents).forEach(nodeId => {
      const connections = getConnectionsForNode(nodeId);
      if (connections.length >= 3) {
        // Find the cohort of this node
        let cohort = -1;
        for (let c = 0; c < data.cohorts.length; c++) {
          if (data.cohorts[c].includes(nodeId)) {
            cohort = c;
            break;
          }
        }
        
        highConnectionNodes[nodeId] = {
          connections,
          cohort
        };
        
        console.log(`Node ${nodeId} has ${connections.length} connections: ${connections.join(', ')}`);
      }
    });

    const coordinates: NodeCoordinates = {};
    
    // Create a map of node ID to its cohort
    const nodeCohortMap: Record<string, number> = {};
    data.cohorts.forEach((cohort, cohortIndex) => {
      cohort.forEach(nodeId => {
        nodeCohortMap[nodeId] = cohortIndex;
      });
    });
    
    // Increase horizontal spacing - change x-coordinate calculation
    const xSpacing = 200; // Increase from 100 to 200 for wider gaps between cohorts
    
    // First, place critical path nodes
    const criticalPath = data.highest_work_path;
    const cohortYOffset: Record<number, number> = {};
    
    criticalPath.forEach(nodeId => {
      const cohortNum = nodeCohortMap[nodeId];
      const x = cohortNum * xSpacing; // Use the increased spacing
      
      // Initialize y-offset for this cohort if not already set
      if (cohortYOffset[cohortNum] === undefined) {
        cohortYOffset[cohortNum] = 0;
      }
      
      // Set y-coordinate based on the current offset for this cohort
      const y = cohortYOffset[cohortNum];
      
      // Increment y-offset for the next node in this cohort
      cohortYOffset[cohortNum] += 100;
      
      // Store coordinates
      coordinates[nodeId] = { x, y };
      console.log(`Critical node ${nodeId} positioned at (${x}, ${y}), cohort ${cohortNum}`);
    });
    
    // Then, place non-critical nodes above and below based on work values
    const criticalSet = new Set(criticalPath);
    
    // Special handling for node 6 and similar nodes with many connections
    // We'll create a map of nodes that need special positioning
    const specialPositioning: Record<string, {sameX: string[], x: number, baseY: number}> = {};
    
    // For each high connection node, check if it has connections in the same cohort
    Object.entries(highConnectionNodes).forEach(([nodeId, {connections, cohort}]) => {
      // Get all connections that are in the same cohort
      const sameCohortConnections = connections.filter(connId => 
        nodeCohortMap[connId] === cohort && !criticalSet.has(connId)
      );
      
      if (sameCohortConnections.length >= 2) {
        // This node has multiple connections in the same cohort - arrange them in a semicircle
        specialPositioning[nodeId] = {
          sameX: sameCohortConnections,
          x: cohort * xSpacing, // Use the increased spacing
          baseY: coordinates[nodeId]?.y || 0
        };
        console.log(`Node ${nodeId} needs special positioning for connections: ${sameCohortConnections.join(', ')}`);
      }
    });
    
    // Place non-critical nodes by cohort
    Object.entries(nonCriticalByCohort).forEach(([cohortStr, nodes]) => {
      const cohortNum = parseInt(cohortStr);
      const x = cohortNum * xSpacing; // Use the increased spacing
      
      // Sort nodes by work value descending
      const sortedNodes = [...nodes].sort((a, b) => {
        const workA = getWorkValueForNode(data, a);
        const workB = getWorkValueForNode(data, b);
        return workB - workA; // Descending order
      });
      
      console.log(`Cohort ${cohortNum} non-critical nodes sorted by work:`, 
        sortedNodes.map(id => `${id}(${getWorkValueForNode(data, id)})`));
      
      // Hardcoded coordinates for Cohort 1 specific nodes if they exist
      if (cohortNum === 1) {
        // First, handle nodes that need special positioning (connections with node 6 or other high connectivity nodes)
        const node6Connections = Object.values(specialPositioning)
          .filter(sp => sp.x === xSpacing) // Cohort 1 has x=xSpacing (used to be 100)
          .flatMap(sp => sp.sameX);
        
        // Define specific positions for nodes 2, 3, 5, 6, 9, 10 in cohort 1
        const specificNodes = {
          '2': { x: xSpacing, y: -100 },
          '3': { x: xSpacing, y: -100 },
          '5': { x: xSpacing, y: 150 },
          '6': { x: xSpacing, y: 200 },
          '9': { x: xSpacing, y: -150 },
          '10': { x: xSpacing, y: -200 }
        };
        
        // Check if any of these specific nodes exist in our sorted nodes
        sortedNodes.forEach(nodeId => {
          if (nodeId in specificNodes) {
            coordinates[nodeId] = specificNodes[nodeId as keyof typeof specificNodes];
            console.log(`Set specific coordinates for node ${nodeId}: (${coordinates[nodeId].x}, ${coordinates[nodeId].y})`);
          }
        });
        
        // Filter out nodes that were already handled
        const remainingNodes = sortedNodes.filter(id => !(id in specificNodes));
        
        // Place remaining nodes alternating above and below
        let aboveY = -250; // Start placing additional nodes above the highest specific node
        let belowY = 250;  // Start placing additional nodes below the lowest specific node
        
        remainingNodes.forEach((nodeId, idx) => {
          if (idx % 2 === 0) {
            // Place above
            coordinates[nodeId] = { x, y: aboveY };
            aboveY -= 100;
          } else {
            // Place below
            coordinates[nodeId] = { x, y: belowY };
            belowY += 100;
          }
          console.log(`Remaining node ${nodeId} positioned at (${x}, ${coordinates[nodeId].y})`);
        });
      } 
      // For other cohorts
      else {
        // Place nodes alternating above and below the critical path nodes
        let aboveY = -100; // Start just above the critical path
        let belowY = 100;  // Start just below the critical path
        
        // If there are critical path nodes in this cohort, start after them
        if (cohortYOffset[cohortNum]) {
          belowY = cohortYOffset[cohortNum];
        }
        
        sortedNodes.forEach((nodeId, idx) => {
          if (idx % 2 === 0) {
            // Higher work nodes go above
            coordinates[nodeId] = { x, y: aboveY };
            aboveY -= 100; // Increase space upward
          } else {
            // Lower work nodes go below
            coordinates[nodeId] = { x, y: belowY };
            belowY += 100; // Increase space downward
          }
          console.log(`Non-critical node ${nodeId} positioned at (${x}, ${coordinates[nodeId].y}), cohort ${cohortNum}`);
        });
      }
    });
    
    // Apply special positioning for heavily connected nodes
    // We'll arrange connected nodes in a semicircular pattern around the central node
    Object.entries(specialPositioning).forEach(([nodeId, {sameX, x, baseY}]) => {
      // Only apply if the node already has coordinates (should be the case for all nodes)
      if (!coordinates[nodeId]) return;
      
      const centralNodeY = coordinates[nodeId].y;
      const radius = 200; // Increase radius from 100 to 200 to match wider x-spacing
      const totalNodes = sameX.length;
      
      // Skip if there are no nodes to position
      if (totalNodes === 0) return;
      
      // Sort the nodes by their current y position if available
      const sortedNodes = [...sameX].sort((a, b) => {
        const aY = coordinates[a]?.y || 0;
        const bY = coordinates[b]?.y || 0;
        return aY - bY;
      });
      
      // Position nodes in a semicircular arc
      sortedNodes.forEach((connId, idx) => {
        // If this node already has coordinates and it's a specific hardcoded node, skip it
        if (coordinates[connId] && nodeCohortMap[connId] === 1 && 
            ['2', '3', '5', '6', '9', '10'].includes(connId)) {
          return;
        }
        
        // Calculate angle based on position in the array, creating an arc
        // We'll position from -60 to 60 degrees for the top half or 120 to 240 for bottom half
        let angle;
        if (totalNodes === 1) {
          angle = Math.PI / 2; // 90 degrees
        } else {
          // Determine whether to place in top or bottom semicircle based on the central node's position
          const useTopHalf = centralNodeY > 0;
          
          if (useTopHalf) {
            // Top half: -60 to 60 degrees (in radians)
            angle = -Math.PI/3 + (Math.PI*2/3) * (idx / (totalNodes - 1));
          } else {
            // Bottom half: 120 to 240 degrees (in radians)
            angle = Math.PI*2/3 + (Math.PI*2/3) * (idx / (totalNodes - 1));
          }
        }
        
        // Calculate position on the arc
        const offsetX = x + Math.cos(angle) * radius;
        const offsetY = centralNodeY + Math.sin(angle) * radius;
        
        // Update coordinates
        coordinates[connId] = { x: offsetX, y: offsetY };
        console.log(`Positioned connected node ${connId} at (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}), angle: ${(angle * 180 / Math.PI).toFixed(1)}°`);
      });
    });
    
    // Check for potential overlaps and fix them
    const usedPositions = new Map<string, string>(); // Map of "x,y" -> nodeId
    const adjustedCoordinates = {...coordinates};
    
    // First pass: identify overlaps
    Object.entries(coordinates).forEach(([nodeId, {x, y}]) => {
      const posKey = `${Math.round(x)},${Math.round(y)}`;
      if (usedPositions.has(posKey)) {
        console.warn(`Overlap detected: Node ${nodeId} and ${usedPositions.get(posKey)} both at position (${x}, ${y})`);
        
        // Fix overlaps by moving the node down slightly
        const cohortNum = nodeCohortMap[nodeId];
        let newY = y + 60; // Add more space than the usual increment
        
        // Check if the new position is also taken
        while (usedPositions.has(`${Math.round(x)},${Math.round(newY)}`)) {
          newY += 60;
        }
        
        adjustedCoordinates[nodeId] = { x, y: newY };
        console.log(`Fixed overlap: Node ${nodeId} moved from (${x}, ${y}) to (${x}, ${newY})`);
      } else {
        usedPositions.set(posKey, nodeId);
      }
    });
    
    // Log all node positions for debugging
    console.log("Node positions (nodeId: x,y):");
    Object.entries(adjustedCoordinates).forEach(([nodeId, {x, y}]) => {
      console.log(`Node ${nodeId}: (${x.toFixed(1)}, ${y.toFixed(1)}), Cohort: ${nodeCohortMap[nodeId]}`);
    });
    
    console.log("Total nodes with coordinates:", Object.keys(adjustedCoordinates).length);
    console.log("Critical path nodes:", criticalPath.length);
    console.log("Non-critical nodes:", Object.keys(adjustedCoordinates).length - criticalPath.length);
    
    // Check specifically for nodes 6 and 11
    if (adjustedCoordinates['6'] && adjustedCoordinates['11']) {
      const node6 = adjustedCoordinates['6'];
      const node11 = adjustedCoordinates['11'];
      const distance = Math.sqrt(Math.pow(node6.x - node11.x, 2) + Math.pow(node6.y - node11.y, 2));
      console.log(`Distance between nodes 6 and 11: ${distance}`);
      console.log(`Node 6 position: (${node6.x.toFixed(1)}, ${node6.y.toFixed(1)}), Cohort: ${nodeCohortMap['6']}`);
      console.log(`Node 11 position: (${node11.x.toFixed(1)}, ${node11.y.toFixed(1)}), Cohort: ${nodeCohortMap['11']}`);
    }
    
    setNodeCoordinates(adjustedCoordinates);
  };

  // Helper to get work value for a node
  const getWorkValueForNode = (data: DAGData, nodeId: string): number => {
    if (data.work && typeof data.work === 'object') {
      return data.work[nodeId] || 0;
    } else if (data.bead_work && typeof data.bead_work === 'object') {
      return data.bead_work[nodeId] || 0;
    }
    return 0;
  };

  // Get connections for a node (parents + children)
  const getNodeConnections = (data: DAGData, nodeId: string): string[] => {
    if (!data || !data.parents) return [];
    
    // Get parents
    const parents = data.parents[nodeId] || [];
    
    // Find children (nodes where this node is a parent)
    const children: string[] = [];
    Object.entries(data.parents).forEach(([childId, parentIds]) => {
      if (parentIds.includes(nodeId)) {
        children.push(childId);
      }
    });
    
    return [...parents, ...children];
  };

  // Count total connections for a node
  const countNodeConnections = (data: DAGData, nodeId: string): number => {
    return getNodeConnections(data, nodeId).length;
  };

  // Check if a node is a merge node (≥3 connections)
  const isHighConnectionNode = (nodeId: string, connectionPairs: [string, string][]): boolean => {
    // Count incoming connections (where nodeId is the child)
    const parentConnections = connectionPairs.filter(([, childId]) => childId === nodeId);
    
    // Count outgoing connections (where nodeId is the parent)
    const childConnections = connectionPairs.filter(([parentId]) => parentId === nodeId);
    
    // Return true if total connections is 3 or more
    return parentConnections.length + childConnections.length >= 3;
  };

  // Get a connection map for a specific node
  const getNodeConnectionMap = (data: DAGData, nodeId: string): {
    parents: string[];
    children: string[];
    siblings: string[];
    grandparents: string[];
    grandchildren: string[];
  } => {
    if (!data || !data.parents) {
      return { parents: [], children: [], siblings: [], grandparents: [], grandchildren: [] };
    }
    
    // Get direct parents of the node
    const parents = data.parents[nodeId] || [];
    
    // Find children (nodes where this node is a parent)
    const children: string[] = [];
    Object.entries(data.parents).forEach(([childId, parentIds]) => {
      if (parentIds.includes(nodeId)) {
        children.push(childId);
      }
    });
    
    // Find siblings (nodes that share a parent with this node)
    const siblings: string[] = [];
    parents.forEach(parentId => {
      Object.entries(data.parents).forEach(([childId, parentIds]) => {
        if (childId !== nodeId && parentIds.includes(parentId)) {
          siblings.push(childId);
        }
      });
    });
    
    // Find grandparents (parents of parents)
    const grandparents: string[] = [];
    parents.forEach(parentId => {
      const parentParents = data.parents[parentId] || [];
      grandparents.push(...parentParents);
    });
    
    // Find grandchildren (children of children)
    const grandchildren: string[] = [];
    children.forEach(childId => {
      Object.entries(data.parents).forEach(([grandchildId, parentIds]) => {
        if (parentIds.includes(childId)) {
          grandchildren.push(grandchildId);
        }
      });
    });
    
    return {
      parents,
      children,
      siblings: Array.from(new Set(siblings)), // Remove duplicates
      grandparents: Array.from(new Set(grandparents)), // Remove duplicates
      grandchildren: Array.from(new Set(grandchildren)) // Remove duplicates
    };
  };

  // Render a minimal UI
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          DAG Visualizer
        </h1>
        <p className="mt-2 text-gray-400">
          Interactive visualization of the Directed Acyclic Graph (DAG) structure used in Braidpool mining
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

      {/* DAG Visualization */}
      {!loading && dagData && nodeCoordinates && (
        <div className="relative w-full h-[600px] bg-gray-800/30 rounded-lg border border-gray-700 overflow-hidden">
          <FullDAGVisualization
            dagData={dagData}
            nodeCoordinates={nodeCoordinates}
            criticalPath={new Set(dagData.highest_work_path)}
            parentsCount={parentsCount}
          />
        </div>
      )}

      {/* Node Notification */}
      {nodeNotification && nodeNotification.visible && (
        <div className="fixed bottom-4 right-4 bg-gray-800/90 p-4 rounded-lg border border-gray-700 shadow-lg max-w-md">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Node Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">ID:</span> {nodeNotification.nodeId}</p>
            <p><span className="text-gray-400">Cohort:</span> {nodeNotification.cohort}</p>
            <p><span className="text-gray-400">Work:</span> {nodeNotification.work}</p>
            <p><span className="text-gray-400">Connections:</span> {nodeNotification.connections}</p>
            {nodeNotification.connectionDetails.length > 0 && (
              <div>
                <p className="text-gray-400">Parent Nodes:</p>
                <ul className="list-disc list-inside text-gray-300">
                  {nodeNotification.connectionDetails.map((parentId) => (
                    <li key={parentId}>{parentId}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Full DAG Visualization Component
function FullDAGVisualization({ 
  dagData, 
  nodeCoordinates,
  criticalPath,
  parentsCount
}: { 
  dagData: DAGData; 
  nodeCoordinates: NodeCoordinates;
  criticalPath: Set<string>;
  parentsCount: Record<string, number>;
}) {
  // Add state for zooming and panning
  const [scale, setScale] = useState(2.5);
  const [transformX, setTransformX] = useState(-100);
  const [transformY, setTransformY] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // State for the hover tooltip that follows the cursor
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
    color: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
    color: ""
  });
  // Add animation speed control state (milliseconds between steps, lower = faster)
  const [animationSpeed, setAnimationSpeed] = useState<number>(1000);
  // State to store connection pairs
  const [connectionPairs, setConnectionPairs] = useState<[string, string][]>([]);
  // State to store pending connections that haven't been added yet
  const [pendingConnections, setPendingConnections] = useState<[string, string][]>([]);
  // State to track if all connections are added
  const [allConnectionsAdded, setAllConnectionsAdded] = useState(false);
  // Store random offsets for each connection to keep them consistent when hovering
  const [connectionOffsets] = useState<Map<string, number>>(new Map());
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  // Add state to track which connections are currently animating
  const [animatingConnections, setAnimatingConnections] = useState<Set<string>>(new Set());
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  // Add state for the node notification
  const [nodeNotification, setNodeNotification] = useState<{
    visible: boolean;
    nodeId: string;
    cohort: number;
    work: number;
    connections: number;
    connectionDetails: string[];  // Array of parent node IDs
    timestamp: number;
  } | null>(null);
  
  // Initialize animation data
  useEffect(() => {
    if (dagData && nodeCoordinates) {
      // Reset visible nodes and connections
      setVisibleNodes(new Set());
      setConnectionPairs([]);
      
      // Get ordered list of node IDs for sequential display
      nodeIdsRef.current = Object.keys(nodeCoordinates);
    }
  }, [dagData, nodeCoordinates]);

  // Animation function to add nodes one by one
  const startNodeAnimation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    let currentIndex = 0;
    
    // Add one node immediately (node 0)
    if (nodeIdsRef.current.length > 0) {
      const firstNodeId = nodeIdsRef.current[0];
      setVisibleNodes(new Set([firstNodeId]));
      
      // Display notification for the first node
      showNodeNotification(firstNodeId);
      
      currentIndex = 1;
    }
    
    // Set up interval for adding remaining nodes - use animationSpeed state
    animationTimerRef.current = setInterval(() => {
      if (currentIndex >= nodeIdsRef.current.length) {
        // Animation complete
        if (animationTimerRef.current) {
          clearInterval(animationTimerRef.current);
          setIsAnimating(false);
        }
        return;
      }
      
      // Add the next node
      const nodeId = nodeIdsRef.current[currentIndex];
      
      // Update visible nodes
      setVisibleNodes(prev => {
        const newVisibleNodes = new Set([...prev, nodeId]);
        return newVisibleNodes;
      });
      
      // Show notification for this node
      showNodeNotification(nodeId);
      
      // Identify which connections involve this new node
      // Wait briefly for the state to update before adding connections
      setTimeout(() => {
        // Use parentsCount to directly determine how many connections to add
        const connectionsToAdd = parentsCount[nodeId] || 0;
        
        // Find all connections involving this node from the pendingConnections array
        const relevantConnections = pendingConnections.filter(([parentId, childId]) => 
          (childId === nodeId)
        );
        
        console.log(`Node ${nodeId} has ${connectionsToAdd} connections to add, found ${relevantConnections.length} in pending`);
        
        // Add each relevant connection directly
        let addedConnections: [string, string][] = [];
        
        relevantConnections.slice(0, connectionsToAdd).forEach(([parentId, childId]) => {
          if (addConnection(parentId, childId)) {
            addedConnections.push([parentId, childId]);
          }
        });
        
        // Remove added connections from pending
        if (addedConnections.length > 0) {
          setPendingConnections(prev => {
            return prev.filter(([parentId, childId]) => {
              // Keep the connection if it's not in addedConnections
              return !addedConnections.some(
                ([addedParent, addedChild]) => 
                  addedParent === parentId && addedChild === childId
              );
            });
          });
          console.log(`Removed ${addedConnections.length} connections from pending`);
        }
      }, 100);
      
      currentIndex++;
    }, animationSpeed);
  };
  
  // Helper function to show node notification
  const showNodeNotification = (nodeId: string) => {
    const cohort = getNodeCohort(nodeId);
    const work = getWorkValue(nodeId);
    const connections = parentsCount[nodeId] || 0;
    
    // Get the actual parent node IDs for this node
    const connectionDetails = dagData.parents[nodeId] || [];
    
    setNodeNotification({
      visible: true,
      nodeId,
      cohort,
      work,
      connections,
      connectionDetails,
      timestamp: Date.now()
    });
    
    // Auto-hide notification after 2 seconds if no new node is added
    setTimeout(() => {
      setNodeNotification(prev => {
        if (prev && prev.nodeId === nodeId && Date.now() - prev.timestamp >= 2000) {
          return null;
        }
        return prev;
      });
    }, 3000);
  };
  
  // Stop the animation
  const stopAnimation = () => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      setIsAnimating(false);
      // Clear the notification when animation is stopped
      setNodeNotification(null);
    }
  };
  
  // Reset animation - update to reset the interval with current speed
  const resetAnimation = () => {
    // Clear any existing timer
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    
    // Reset animation state
    setIsAnimating(false);
    setVisibleNodes(new Set());
    setConnectionPairs([]);
    setPendingConnections(prev => {
      // Prepare all possible connections
      const allConnections: [string, string][] = [];
      Object.entries(dagData.parents).forEach(([childId, parentIds]) => {
        parentIds.forEach(parentId => {
          allConnections.push([parentId, childId]);
        });
      });
      return allConnections;
    });
    
    // Reset notification
    setNodeNotification(null);
  };
  
  // SVG dimensions
  const { width, height } = calculateSVGDimensions();
  
  // Find min and max work values for color gradient
  const workValues = Object.keys(nodeCoordinates).map(nodeId => getWorkValue(nodeId));
  const maxWork = Math.max(...workValues);
  const minWork = Math.min(...workValues);
  
  // Extract connection pairs from dagData but don't add them automatically
  useEffect(() => {
    if (!dagData?.parents) return;
    
    // Clear existing connections
    setConnectionPairs([]);
    
    // Extract all connections from dagData.parents
    const extractedPairs: [string, string][] = [];
    
    // Convert parent-child relationships from dagData.parents into pairs
    Object.entries(dagData.parents).forEach(([childId, parentIds]) => {
      parentIds.forEach(parentId => {
        extractedPairs.push([parentId, childId]);
      });
    });
    
    console.log("FullDAGVisualization - Extracted connection pairs:", extractedPairs.length);
    
    // Store them as pending connections rather than adding them all at once
    setPendingConnections(extractedPairs);
    setAllConnectionsAdded(false);
    
  }, [dagData]); // Only re-run when dagData changes
  
  // Function to add a new connection pair
  const addConnection = (fromNodeId: string, toNodeId: string) => {
    // Validate that both nodes exist in the nodeCoordinates
    if (!nodeCoordinates[fromNodeId]) {
      console.error(`Source node ${fromNodeId} does not exist or has no coordinates`);
      return false;
    }
    
    if (!nodeCoordinates[toNodeId]) {
      console.error(`Target node ${toNodeId} does not exist or has no coordinates`);
      return false;
    }
    
    // Check if connection already exists - more thorough check to prevent duplicates
    const connectionExists = connectionPairs.some(
      ([source, target]) => 
        (source === fromNodeId && target === toNodeId) || 
        (source === toNodeId && target === fromNodeId)
    );
    
    if (connectionExists) {
      console.warn(`Connection between ${fromNodeId} and ${toNodeId} already exists`);
      return false;
    }
    
    // Generate a connection ID
    const connectionId = `${fromNodeId}-${toNodeId}`;
    
    // Store a random offset for this connection (between 0 and 1)
    connectionOffsets.set(connectionId, Math.random());
    
    // Add the new connection
    console.log(`Adding new connection: ${fromNodeId} → ${toNodeId}`);
    setConnectionPairs(prevPairs => [...prevPairs, [fromNodeId, toNodeId]]);
    
    // Add this connection to the animating set
    setAnimatingConnections(prev => {
      const newSet = new Set(prev);
      newSet.add(connectionId);
      return newSet;
    });
    
    // Remove from animating connections after animation completes
    setTimeout(() => {
      setAnimatingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }, 1000); // 1 second animation duration
    
    return true;
  };
  
  // Create a map of children
  function createChildrenMap() {
    const childrenMap: Record<string, string[]> = {};
    
    // Initialize empty arrays for all unique nodes in connections
    const uniqueNodes = new Set<string>();
    connectionPairs.forEach(([parentId, childId]) => {
      uniqueNodes.add(parentId);
      uniqueNodes.add(childId);
    });
    
    // Initialize empty arrays for all nodes
    uniqueNodes.forEach(nodeId => {
      childrenMap[nodeId] = [];
    });
    
    // Populate children arrays based on connectionPairs
    connectionPairs.forEach(([parentId, childId]) => {
      // Add childId to the children array of parentId
      childrenMap[parentId].push(childId);
    });
    
    return childrenMap;
  }
  
  // Compute the childrenMap when connectionPairs changes
  const childrenMap = useMemo(() => createChildrenMap(), [connectionPairs]);
  
  // Zoom functions
  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.2));
  };

  const handleZoomReset = () => {
    setScale(1);
    setTransformX(0);
    setTransformY(0);
  };

  // Drag handling for panning
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setTransformX(prevX => prevX + (e.clientX - dragStart.x) / scale);
      setTransformY(prevY => prevY + (e.clientY - dragStart.y) / scale);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom support - updated to prevent browser zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Only zoom if Ctrl key is pressed
    if (!e.ctrlKey) return;
    
    // Prevent browser zoom
    e.preventDefault();
    e.stopPropagation();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(5, scale * zoomFactor));
    
    // Get mouse position relative to SVG
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    
    // Calculate new transform to zoom at mouse position
    const scaleChange = newScale / scale;
    const newTransformX = mouseX - scaleChange * (mouseX - transformX * scale);
    const newTransformY = mouseY - scaleChange * (mouseY - transformY * scale);
    
    setScale(newScale);
    setTransformX(newTransformX / newScale);
    setTransformY(newTransformY / newScale);
  };

  // Calculate SVG dimensions
  function calculateSVGDimensions() {
    let maxX = 0;
    let minX = 0;
    let maxY = 0;
    let minY = 0;
    
    // Find the maximum and minimum x and y coordinates
    Object.values(nodeCoordinates).forEach(({ x, y }) => {
      maxX = Math.max(maxX, x);
      minX = Math.min(minX, x);
      maxY = Math.max(maxY, y);
      minY = Math.min(minY, y);
    });
    
    // Add padding
    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    // Transformation to ensure all nodes are visible (shift to positive coordinates)
    const transformX = -minX + padding;
    const transformY = -minY + padding;
    
    return { width, height, transformX, transformY };
  }

  // Get work value for a node
  function getWorkValue(nodeId: string): number {
    if (dagData.work && typeof dagData.work === 'object') {
      return dagData.work[nodeId] || 0;
    } else if (dagData.bead_work && typeof dagData.bead_work === 'object') {
      return dagData.bead_work[nodeId] || 0;
    }
    return 0;
  }
  
  // Get cohort for a node
  function getNodeCohort(nodeId: string): number {
    for (let cohortIndex = 0; cohortIndex < dagData.cohorts.length; cohortIndex++) {
      if (dagData.cohorts[cohortIndex].includes(nodeId)) {
        return cohortIndex;
      }
    }
    return -1;
  }
  
  // Check if a node is a merge node (≥3 connections)
  function isHighConnectionNode(nodeId: string): boolean {
    // Count incoming connections (where nodeId is the child)
    const parentConnections = connectionPairs.filter(([, childId]) => childId === nodeId);
    
    // Count outgoing connections (where nodeId is the parent)
    const childConnections = connectionPairs.filter(([parentId]) => parentId === nodeId);
    
    // Return true if total connections is 3 or more
    return parentConnections.length + childConnections.length >= 3;
  }

  // Get color for a node based on work value
  function getNodeColor(nodeId: string): string {
    if (criticalPath.has(nodeId)) {
      // Critical path nodes get specific colors
      if (nodeId === dagData.highest_work_path[0]) {
        return "#22c55e"; // Green for genesis
      } else if (nodeId === dagData.highest_work_path[dagData.highest_work_path.length - 1]) {
        return "#3b82f6"; // Blue for tip
      }
      return "#f59e0b"; // Amber for other critical path nodes
    }
    
    // Non-critical nodes get colors based on work value
    const work = getWorkValue(nodeId);
    const normalizedWork = maxWork === minWork ? 0.5 : (work - minWork) / (maxWork - minWork);
    
    // Use a more diverse color palette for non-critical nodes based on work value
    // This creates a rainbow gradient from red (low work) to violet (high work)
    if (normalizedWork < 0.2) {
      // Red range
      return `rgb(220, 38, 38)`;
    } else if (normalizedWork < 0.4) {
      // Orange range
      return `rgb(234, 88, 12)`;
    } else if (normalizedWork < 0.6) {
      // Yellow range
      return `rgb(202, 138, 4)`;
    } else if (normalizedWork < 0.8) {
      // Green range
      return `rgb(22, 163, 74)`;
    } else {
      // Blue/Purple range
      return `rgb(79, 70, 229)`;
    }
  }
  
  // Draw links between nodes
  function renderLinks() {
    const links: React.ReactElement[] = [];
    const renderedConnections = new Set<string>(); // Keep track of rendered connections
    
    // Use connectionPairs array instead of iterating through dagData.parents
    connectionPairs.forEach(([parentId, childId]) => {
      if (!nodeCoordinates[childId] || !nodeCoordinates[parentId]) return;
      
      // Create a unique connection identifier (order doesn't matter for the key)
      const connectionKey = [parentId, childId].sort().join('-');
      
      // Skip if already rendered to prevent duplicates
      if (renderedConnections.has(connectionKey)) return;
      renderedConnections.add(connectionKey);
      
      const childCoords = {
        x: nodeCoordinates[childId].x,
        y: nodeCoordinates[childId].y
      };
      
      const parentCoords = {
        x: nodeCoordinates[parentId].x,
        y: nodeCoordinates[parentId].y
      };
      
      // Determine if this is a critical path link
      const isCriticalLink = criticalPath.has(parentId) && criticalPath.has(childId) &&
        dagData.highest_work_path.indexOf(parentId) === dagData.highest_work_path.indexOf(childId) - 1;
      
      // Use curved lines for nodes in the same cohort (especially helpful for node 6 connections)
      const sameX = parentCoords.x === childCoords.x;
      let linkPath = "";
      
      if (sameX) {
        // For same-cohort connections, use curved paths to show the connection clearly
        // Generate connection ID
        const connectionId = `${parentId}-${childId}`;
        
        // Use the stored random value if available, otherwise generate and store a new one
        if (!connectionOffsets.has(connectionId)) {
          connectionOffsets.set(connectionId, Math.random());
        }
        const randomOffset = connectionOffsets.get(connectionId) || 0.5;
        
        // Use the random offset to calculate control point (between 100 and 200)
        const controlPointX = parentCoords.x + randomOffset * 100 + 100;
        linkPath = `M${parentCoords.x},${parentCoords.y} C${controlPointX},${parentCoords.y} ${controlPointX},${childCoords.y} ${childCoords.x},${childCoords.y}`;
      } else {
        // For connections between different cohorts, use straight lines
        linkPath = `M${parentCoords.x},${parentCoords.y} L${childCoords.x},${childCoords.y}`;
      }

      // Determine link color based on source node
      let linkColor;
      if (isCriticalLink) {
        linkColor = "#f59e0b"; // Amber for critical path links
      } else if (criticalPath.has(parentId)) {
        linkColor = "#8b5cf6"; // Purple for links from critical nodes
      } else {
        // Color based on parent node's cohort
        const parentCohort = getNodeCohort(parentId);
        switch (parentCohort % 5) {
          case 0: linkColor = "#ef4444"; break; // Red
          case 1: linkColor = "#f97316"; break; // Orange
          case 2: linkColor = "#eab308"; break; // Yellow
          case 3: linkColor = "#22c55e"; break; // Green
          case 4: linkColor = "#3b82f6"; break; // Blue
          default: linkColor = "#6b7280"; break; // Gray
        }
      }

      // Connection content for tooltip
      const tooltipContent = `${parentId} → ${childId}`;

      // Check if this connection is currently animating
      const isAnimating = animatingConnections.has(`${parentId}-${childId}`);
      
      // Shared hover event handlers for both paths
      const handleMouseEnter = (e: React.MouseEvent) => {
        // Show tooltip with connection information
        setTooltip({
          visible: true,
          x: e.clientX - 200,
          y: e.clientY - 100,
          content: tooltipContent,
          color: linkColor
        });
      };
      
      const handleMouseMove = (e: React.MouseEvent) => {
        // Update tooltip position as cursor moves
        setTooltip(prev => ({
          ...prev,
          visible: true,
          x: e.clientX - 200,
          y: e.clientY - 100
        }));
      };
      
      const handleMouseLeave = () => {
        // Hide tooltip when mouse leaves
        setTooltip(prev => ({
          ...prev,
          visible: false
        }));
      };
      
      links.push(
        <g 
          key={connectionKey} 
          className="link-group"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Visible line path with all styling */}
          <path 
            d={linkPath} 
            stroke={linkColor}
            strokeWidth={isCriticalLink ? 2 : 1} 
            fill="none"
            markerEnd={`url(#arrowhead-${linkColor.replace('#', '')})`}
            className={`link-path transition-all duration-100 ${isAnimating ? 'animating-connection' : ''}`}
            // This allows stroke width to stay visually consistent during zoom
            style={{ 
              vectorEffect: "non-scaling-stroke",
              strokeDasharray: isAnimating ? "5,5" : "none",
              animation: isAnimating ? "dashOffset 1s linear, fadeIn 1s ease-in-out" : "none"
            }}
          />
          
          {/* Invisible wider path for easier hovering - no separate handlers needed since parent handles it */}
          <path 
            d={linkPath} 
            stroke="transparent" 
            strokeWidth="5" 
            fill="none"
          />
        </g>
      );
    });
    
    return links;
  }
  
  // Render nodes
  function renderNodes() {
    if (!nodeCoordinates) return null;
    
    return Object.entries(nodeCoordinates).map(([nodeId, coords]) => {
      // Only render nodes that are in the visible set
      if (!visibleNodes.has(nodeId)) return null;
      
      // Rest of the existing renderNodes function
      const x = coords.x;
      const y = coords.y;
      const isCritical = criticalPath.has(nodeId);
      const isHighConnection = isHighConnectionNode(nodeId);
      const nodeColor = getNodeColor(nodeId);
      const cohort = getNodeCohort(nodeId);
      const workValue = getWorkValue(nodeId);
      
      // Size based on importance
      const radius = isCritical ? 18 : 12;
      
      return (
        <g key={`node-${nodeId}`}>
          <circle
            cx={x}
            cy={y}
            r={radius}
            fill={nodeColor}
            stroke={isHighConnection ? "#ff6b6b" : "#333"}
            strokeWidth={isHighConnection ? 3 : 1}
            onMouseEnter={() => {
              setTooltip({
                visible: true,
                x: x,
                y: y,
                content: `Node: ${nodeId}, Cohort: ${cohort}, Work: ${workValue}`,
                color: nodeColor
              });
            }}
            onMouseMove={(e) => {
              setTooltip({
                visible: true,
                x: e.clientX - 200,
                y: e.clientY - 100,
                content: `Node: ${nodeId}, Cohort: ${cohort}, Work: ${workValue}`,
                color: nodeColor
              });
            }}
            onMouseLeave={() => {
              setTooltip({
                visible: false,
                x: 0,
                y: 0,
                content: "",
                color: ""
              });
            }}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={isCritical ? "14" : "12"}
            fontWeight={isCritical ? "bold" : "normal"}
            fill="#ffffff"
            className="select-none"
            style={{ 
              textShadow: "-1px -1px 2px rgba(0,0,0,0.5), 1px -1px 2px rgba(0,0,0,0.5), -1px 1px 2px rgba(0,0,0,0.5), 1px 1px 2px rgba(0,0,0,0.5)" 
            }}
          >
            {nodeId}
          </text>
        </g>
      );
    });
  }
  
  // Handle speed change
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseInt(e.target.value);
    setAnimationSpeed(newSpeed);
    
    // If animation is currently running, restart it with the new speed
    if (isAnimating && animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      
      let currentIndex = visibleNodes.size;
      
      // Restart the interval with new speed
      animationTimerRef.current = setInterval(() => {
        if (currentIndex >= nodeIdsRef.current.length) {
          if (animationTimerRef.current) {
            clearInterval(animationTimerRef.current);
            setIsAnimating(false);
          }
          return;
        }
        
        const nodeId = nodeIdsRef.current[currentIndex];
        
        setVisibleNodes(prev => {
          const newVisibleNodes = new Set([...prev, nodeId]);
          return newVisibleNodes;
        });
        
        showNodeNotification(nodeId);
        
        setTimeout(() => {
          const connectionsToAdd = parentsCount[nodeId] || 0;
          const relevantConnections = pendingConnections.filter(([parentId, childId]) => 
            (childId === nodeId)
          );
      
          let addedConnections: [string, string][] = [];
          
          relevantConnections.slice(0, connectionsToAdd).forEach(([parentId, childId]) => {
            if (addConnection(parentId, childId)) {
              addedConnections.push([parentId, childId]);
            }
          });
          
          if (addedConnections.length > 0) {
            setPendingConnections(prev => {
              return prev.filter(([parentId, childId]) => {
                return !addedConnections.some(
                  ([addedParent, addedChild]) => 
                    addedParent === parentId && addedChild === childId
                );
              });
            });
          }
        }, 100);
        
        currentIndex++;
      }, newSpeed);
    }
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Controls bar with added speed control */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex flex-wrap items-center gap-3 select-none">
        {/* Existing controls */}
        <div className="flex items-center space-x-2">
          <button
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={handleZoomReset}
            title="Reset Zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
    </div>
        
        <div className="h-6 w-px bg-gray-600 mx-1"></div>
        
        {/* Animation controls */}
        <div className="flex items-center space-x-2">
          <button
            className={`p-2 text-white rounded ${isAnimating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            onClick={isAnimating ? stopAnimation : startNodeAnimation}
            title={isAnimating ? "Stop Animation" : "Start Animation"}
          >
            {isAnimating ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded"
            onClick={resetAnimation}
            title="Reset Animation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="h-6 w-px bg-gray-600 mx-1"></div>
        
        {/* Speed control slider */}
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <span className="text-gray-300 text-sm whitespace-nowrap">Speed:</span>
          <div className="flex items-center space-x-2 w-full">
            <span className="text-gray-300 text-xs">Fast</span>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={animationSpeed}
              onChange={handleSpeedChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Animation Speed: ${animationSpeed}ms`}
            />
            <span className="text-gray-300 text-xs">Slow</span>
          </div>
          <span className="text-gray-300 text-xs w-14">{animationSpeed}ms</span>
        </div>
        
        {/* Display number of nodes and connections */}
        <div className="flex items-center space-x-2 ml-auto text-gray-300 text-sm">
          <span>Nodes: {visibleNodes.size}/{nodeIdsRef.current.length}</span>
          <span>Connections: {connectionPairs.length}/{pendingConnections.length + connectionPairs.length}</span>
        </div>
      </div>
      
      {/* Instructions - for zoom and pan behavior */}
      <div className="absolute bottom-4 left-4 z-20 bg-gray-800 bg-opacity-80 p-2 rounded-md text-xs text-white border border-gray-700 shadow-lg select-none">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Hold <kbd className="px-1 py-0.5 bg-gray-700 rounded">Ctrl</kbd> + scroll to zoom, drag to pan</span>
        </div>
      </div>
      
      {/* Cursor tooltip - positioned using fixed div outside SVG */}
      {tooltip.visible && (
        <div 
          className="absolute pointer-events-none transition-opacity duration-200 z-30 select-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            transform: 'translateX(-50%)',
            opacity: tooltip.visible ? 1 : 0
          }}
        >
          <div 
            className="bg-gray-800 text-white px-3 py-1.5 rounded shadow-lg text-xs text-center whitespace-nowrap"
            style={{ border: `1px solid ${tooltip.color}`, minWidth: '100px' }}
          >
            {tooltip.content}
          </div>
        </div>
      )}
      
      {/* Node notification */}
      {nodeNotification && (
        <div 
          className="absolute bottom-4 right-4 z-20 bg-gray-800 bg-opacity-90 p-3 rounded-md text-white border border-gray-700 shadow-lg select-none transition-opacity duration-300"
          style={{ opacity: nodeNotification.visible ? 1 : 0, maxWidth: '350px' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center mb-1">
              <div 
                className="w-6 h-6 rounded-full mr-2 flex items-center justify-center" 
                style={{ backgroundColor: getNodeColor(nodeNotification.nodeId) }}
              >
                <span className="text-xs font-bold">{nodeNotification.nodeId}</span>
              </div>
              <span className="text-lg font-bold">Node {nodeNotification.nodeId} Added</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-gray-300">Cohort:</div>
              <div className="text-white font-medium">{nodeNotification.cohort}</div>
              
              <div className="text-gray-300">Work:</div>
              <div className="text-white font-medium">{nodeNotification.work}</div>
              
              <div className="text-gray-300">Parents:</div>
              <div className="text-white font-medium">{nodeNotification.connections}</div>
              
              <div className="text-gray-300">Critical:</div>
              <div className="text-white font-medium">
                {criticalPath.has(nodeNotification.nodeId) ? "Yes" : "No"}
              </div>
              
              {/* Only show connections section if there are connections */}
              {nodeNotification.connectionDetails.length > 0 && (
                <>
                  <div className="text-gray-300 col-span-2 mt-1 border-t border-gray-700 pt-1">Connections:</div>
                  <div className="col-span-2 text-sm">
                    {nodeNotification.connectionDetails.map((parentId, index) => (
                      <div key={`connection-${parentId}`} className="flex items-center mb-1">
                        <div 
                          className="w-5 h-5 rounded-full mr-2 flex items-center justify-center" 
                          style={{ backgroundColor: getNodeColor(parentId) }}
                        >
                          <span className="text-xs">{parentId}</span>
                        </div>
                        <span>
                          {parentId} → {nodeNotification.nodeId}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* SVG container with proper overflow handling */}
      <div className="flex-1 overflow-auto" style={{ position: 'relative' }}>
        <svg 
          width="100%" 
          height="100%" 
          className="bg-gray-900 rounded cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          preserveAspectRatio="xMidYMid meet"
          viewBox={`0 0 ${width} ${height}`}
          style={{ 
            minWidth: '100%', 
            minHeight: '100%',
            overflow: 'visible'
          }}
        >
          {/* Arrow marker definitions for links of different colors */}
          <defs>
            {/* Critical path links (amber) */}
            <marker
              id="arrowhead-f59e0b"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#f59e0b" />
            </marker>
            
            {/* Links from critical nodes (purple) */}
            <marker
              id="arrowhead-8b5cf6"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#8b5cf6" />
            </marker>
            
            {/* Cohort-based colors */}
            <marker
              id="arrowhead-ef4444"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
            </marker>
            
            <marker
              id="arrowhead-f97316"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#f97316" />
            </marker>
            
            <marker
              id="arrowhead-eab308"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#eab308" />
            </marker>
            
            <marker
              id="arrowhead-22c55e"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#22c55e" />
            </marker>
            
            <marker
              id="arrowhead-3b82f6"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#3b82f6" />
            </marker>
            
            <marker
              id="arrowhead-6b7280"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#6b7280" />
            </marker>
          </defs>
          
          {/* Add CSS for link hover effects */}
          <style>
            {`
              .link-group:hover .link-path {
                stroke-width: 3px !important;
                filter: drop-shadow(0 0 3px currentColor);
              }
              .link-tooltip {
                transition: opacity 0.2s ease-in-out;
              }
              .animating-connection {
                stroke-dasharray: 5, 5;
                animation: dashOffset 1s linear, fadeIn 1s ease-in-out;
              }
              @keyframes dashOffset {
                from {
                  stroke-dashoffset: 10;
                }
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  stroke-width: 0;
                }
                to {
                  opacity: 1;
                  stroke-width: 2px;
                }
              }
            `}
          </style>
          
          {/* Main group that will be transformed for zoom/pan */}
          <g transform={`scale(${scale}) translate(${transformX}, ${transformY})`}>
            {/* Links */}
            {renderLinks()}
            
            {/* Nodes */}
            {renderNodes()}
          </g>
          
          {/* Legend - moved to top right corner */}
          <g className="legend select-none">
            <svg x="calc(100%)" y="20" width="360" height="550">
              <rect width="360" height="420" fill="rgba(17, 24, 39, 0.8)" rx="10" />
              <text x="25" y="45" fill="white" fontSize="24" fontWeight="bold">Legend</text>
              
              {/* Critical Path Nodes section */}
              <text x="25" y="90" fill="white" fontSize="20" fontWeight="bold">Critical Path Nodes:</text>
              
              <circle cx="45" cy="125" r="14" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
              <text x="75" y="130" fill="white" fontSize="18">Genesis Node</text>
              
              <circle cx="45" cy="170" r="14" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
              <text x="75" y="175" fill="white" fontSize="18">Tip Node</text>
              
              <circle cx="45" cy="215" r="14" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text x="75" y="220" fill="white" fontSize="18">Critical Path Node</text>
              
              {/* Non-Critical Nodes section */}
              <text x="25" y="265" fill="white" fontSize="20" fontWeight="bold">Non-Critical Nodes (by work):</text>
              
              <circle cx="45" cy="300" r="12" fill="rgb(220, 38, 38)" stroke="#9ca3af" strokeWidth="1" />
              <text x="75" y="305" fill="white" fontSize="18">Low Work</text>
              
              <circle cx="195" cy="300" r="12" fill="rgb(202, 138, 4)" stroke="#9ca3af" strokeWidth="1" />
              <text x="225" y="305" fill="white" fontSize="18">Medium</text>
              
              <circle cx="45" cy="340" r="12" fill="rgb(79, 70, 229)" stroke="#9ca3af" strokeWidth="1" />
              <text x="75" y="345" fill="white" fontSize="18">High</text>
              
              {/* Connections section */}
              <text x="25" y="385" fill="white" fontSize="20" fontWeight="bold">Connections:</text>
              
              <line x1="45" y1="420" x2="80" y2="420" stroke="#f59e0b" strokeWidth="3" />
              <text x="90" y="425" fill="white" fontSize="18">Critical Path</text>
              
              <line x1="45" y1="460" x2="80" y2="460" stroke="#8b5cf6" strokeWidth="2" />
              <text x="90" y="465" fill="white" fontSize="18">From Critical Node</text>
              
              <line x1="225" y1="420" x2="260" y2="420" stroke="#ef4444" strokeWidth="2" />
              <text x="270" y="425" fill="white" fontSize="18">Cohort-Based</text>
            </svg>
          </g>
        </svg>
      </div>
    </div>
  );
}