"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Settings, 
  AlertCircle,
  DollarSign,
  BarChart2,
  Clock,
  Zap
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Generate fake data for the last 24 hours
const generateFakeData = () => {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now);
    time.setHours(now.getHours() - i);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hashrate: Math.floor(Math.random() * 50) + 100, // Random hashrate between 100-150 MH/s
      shares: Math.floor(Math.random() * 20) + 5, // Random shares between 5-25
    });
  }
  return data;
};

export default function MinerStatus() {
  const [activeTab, setActiveTab] = useState("overview");
  const fakeData = generateFakeData();

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Miner Status Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
            Connected
          </Badge>
          <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-gray-900/50">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="hardware" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
            <Cpu className="w-4 h-4" />
            Hardware
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400">
            <Zap className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <DollarSign className="w-4 h-4" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2 data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400">
            <Network className="w-4 h-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-400">Current Hashrate</CardTitle>
                <Zap className="h-4 w-4 text-indigo-400/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-400">125.4 MH/s</div>
                <p className="text-xs text-indigo-400/70">
                  +12.3% from last hour
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-violet-400">Shares</CardTitle>
                <BarChart2 className="h-4 w-4 text-violet-400/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-400">1,234</div>
                <p className="text-xs text-violet-400/70">
                  98.5% accepted
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-teal-400">Temperature</CardTitle>
                <Cpu className="h-4 w-4 text-teal-400/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-400">62°C</div>
                <p className="text-xs text-teal-400/70">
                  Within safe range
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-400">Estimated Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-400/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">0.0024 BTC</div>
                <p className="text-xs text-amber-400/70">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Hashrate Graph */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-indigo-400">Hashrate History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fakeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hashrate" 
                      stroke="#818CF8" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#818CF8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hardware Tab */}
        <TabsContent value="hardware">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-violet-400">GPU Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-violet-400">GPU 0</p>
                      <p className="text-sm text-violet-400/70">NVIDIA RTX 3080</p>
                    </div>
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/20">
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-violet-400/70">
                      <span>Temperature</span>
                      <span>62°C</span>
                    </div>
                    <Progress value={62} max={90} className="h-2 bg-violet-500/20">
                      <div className="h-full w-full bg-violet-500 rounded-full" />
                    </Progress>
                    <div className="flex justify-between text-sm text-violet-400/70">
                      <span>Power Usage</span>
                      <span>220W</span>
                    </div>
                    <Progress value={73} max={100} className="h-2 bg-violet-500/20">
                      <div className="h-full w-full bg-violet-500 rounded-full" />
                    </Progress>
                    <div className="flex justify-between text-sm text-violet-400/70">
                      <span>Memory Usage</span>
                      <span>8.2GB / 10GB</span>
                    </div>
                    <Progress value={82} max={100} className="h-2 bg-violet-500/20">
                      <div className="h-full w-full bg-violet-500 rounded-full" />
                    </Progress>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-sky-400">System Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-sky-400/70">
                      <span>CPU Usage</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} max={100} className="h-2 bg-sky-500/20">
                      <div className="h-full w-full bg-sky-500 rounded-full" />
                    </Progress>
                    <div className="flex justify-between text-sm text-sky-400/70">
                      <span>Memory Usage</span>
                      <span>12GB / 16GB</span>
                    </div>
                    <Progress value={75} max={100} className="h-2 bg-sky-500/20">
                      <div className="h-full w-full bg-sky-500 rounded-full" />
                    </Progress>
                    <div className="flex justify-between text-sm text-sky-400/70">
                      <span>Disk Usage</span>
                      <span>256GB / 1TB</span>
                    </div>
                    <Progress value={25} max={100} className="h-2 bg-sky-500/20">
                      <div className="h-full w-full bg-sky-500 rounded-full" />
                    </Progress>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-emerald-400">Hashrate Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-emerald-400/70">
                      <span>Average Hashrate</span>
                      <span>128.5 MH/s</span>
                    </div>
                    <Progress value={85} max={100} className="h-2 bg-emerald-500/20">
                      <div className="h-full w-full bg-emerald-500 rounded-full" />
                    </Progress>
                    <div className="flex justify-between text-sm text-emerald-400/70">
                      <span>Peak Hashrate</span>
                      <span>145.2 MH/s</span>
                    </div>
                    <Progress value={95} max={100} className="h-2 bg-emerald-500/20">
                      <div className="h-full w-full bg-emerald-500 rounded-full" />
                    </Progress>
                    <div className="flex justify-between text-sm text-emerald-400/70">
                      <span>Stale Shares</span>
                      <span>1.2%</span>
                    </div>
                    <Progress value={1.2} max={100} className="h-2 bg-emerald-500/20">
                      <div className="h-full w-full bg-emerald-500 rounded-full" />
                    </Progress>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-cyan-400">Power Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-cyan-400/70">
                      <span>Power Usage</span>
                      <span>220W</span>
                    </div>
                    <Progress value={73} max={100} className="h-2 bg-cyan-500/20 after:bg-cyan-500" />
                    <div className="flex justify-between text-sm text-cyan-400/70">
                      <span>Efficiency</span>
                      <span>0.58 MH/s/W</span>
                    </div>
                    <Progress value={85} max={100} className="h-2 bg-cyan-500/20 after:bg-cyan-500" />
                    <div className="flex justify-between text-sm text-cyan-400/70">
                      <span>Power Cost</span>
                      <span>$0.12/kWh</span>
                    </div>
                    <Progress value={40} max={100} className="h-2 bg-cyan-500/20 after:bg-cyan-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-amber-400">Daily Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-amber-400/70">
                      <span>Today</span>
                      <span>0.0024 BTC</span>
                    </div>
                    <Progress value={75} max={100} className="h-2 bg-amber-500/20 after:bg-amber-500" />
                    <div className="flex justify-between text-sm text-amber-400/70">
                      <span>Yesterday</span>
                      <span>0.0021 BTC</span>
                    </div>
                    <Progress value={65} max={100} className="h-2 bg-amber-500/20 after:bg-amber-500" />
                    <div className="flex justify-between text-sm text-amber-400/70">
                      <span>7-Day Average</span>
                      <span>0.0023 BTC</span>
                    </div>
                    <Progress value={72} max={100} className="h-2 bg-amber-500/20 after:bg-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-amber-400">Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-amber-400/70">
                      <span>Last Payout</span>
                      <span>0.012 BTC</span>
                    </div>
                    <Progress value={100} max={100} className="h-2 bg-amber-500/20 after:bg-amber-500" />
                    <div className="flex justify-between text-sm text-amber-400/70">
                      <span>Total Earned</span>
                      <span>0.156 BTC</span>
                    </div>
                    <Progress value={78} max={100} className="h-2 bg-amber-500/20 after:bg-amber-500" />
                    <div className="flex justify-between text-sm text-amber-400/70">
                      <span>Next Payout</span>
                      <span>0.008 BTC</span>
                    </div>
                    <Progress value={67} max={100} className="h-2 bg-amber-500/20 after:bg-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-blue-400">Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-blue-400/70">
                      <span>Pool Connection</span>
                      <span>Connected</span>
                    </div>
                    <Progress value={100} max={100} className="h-2 bg-blue-500/20 after:bg-blue-500" />
                    <div className="flex justify-between text-sm text-blue-400/70">
                      <span>Latency</span>
                      <span>45ms</span>
                    </div>
                    <Progress value={90} max={100} className="h-2 bg-blue-500/20 after:bg-blue-500" />
                    <div className="flex justify-between text-sm text-blue-400/70">
                      <span>Uptime</span>
                      <span>99.8%</span>
                    </div>
                    <Progress value={99.8} max={100} className="h-2 bg-blue-500/20 after:bg-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-purple-400">Network Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-purple-400/70">
                      <span>Active Miners</span>
                      <span>1,234</span>
                    </div>
                    <Progress value={75} max={100} className="h-2 bg-purple-500/20 after:bg-purple-500" />
                    <div className="flex justify-between text-sm text-purple-400/70">
                      <span>Pool Hashrate</span>
                      <span>15.2 TH/s</span>
                    </div>
                    <Progress value={85} max={100} className="h-2 bg-purple-500/20 after:bg-purple-500" />
                    <div className="flex justify-between text-sm text-purple-400/70">
                      <span>Network Difficulty</span>
                      <span>45.2T</span>
                    </div>
                    <Progress value={92} max={100} className="h-2 bg-purple-500/20 after:bg-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-rose-400">Mining History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-rose-400/70">
                      <span>Total Runtime</span>
                      <span>14d 6h</span>
                    </div>
                    <Progress value={85} max={100} className="h-2 bg-rose-500/20 after:bg-rose-500" />
                    <div className="flex justify-between text-sm text-rose-400/70">
                      <span>Blocks Found</span>
                      <span>3</span>
                    </div>
                    <Progress value={60} max={100} className="h-2 bg-rose-500/20 after:bg-rose-500" />
                    <div className="flex justify-between text-sm text-rose-400/70">
                      <span>Total Shares</span>
                      <span>45,678</span>
                    </div>
                    <Progress value={75} max={100} className="h-2 bg-rose-500/20 after:bg-rose-500" />
      </div>
    </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-rose-400">Performance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-rose-400/70">
                      <span>Best Hashrate</span>
                      <span>145.2 MH/s</span>
                    </div>
                    <Progress value={95} max={100} className="h-2 bg-rose-500/20 after:bg-rose-500" />
                    <div className="flex justify-between text-sm text-rose-400/70">
                      <span>Longest Run</span>
                      <span>7d 12h</span>
                    </div>
                    <Progress value={90} max={100} className="h-2 bg-rose-500/20 after:bg-rose-500" />
                    <div className="flex justify-between text-sm text-rose-400/70">
                      <span>Best Efficiency</span>
                      <span>0.62 MH/s/W</span>
                    </div>
                    <Progress value={88} max={100} className="h-2 bg-rose-500/20 after:bg-rose-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
