"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3001"); // Update with your backend port

export const useSocket = () => {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    socket.on("update", (incoming: any) => {
      setData(incoming);
    });

    return () => {
      socket.off("update");
    };
  }, []);

  return data;
};
