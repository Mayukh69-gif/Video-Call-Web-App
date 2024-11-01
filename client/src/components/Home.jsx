import React, { useEffect, useCallback, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import ReactPlayer from "react-player";
import peer from "../services/peer";

function Home () {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleJoinRoom = useCallback(({ email, id }) => {
    console.log(`Email: ${email} joined the room with id: ${id}`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming call from ${from} with offer ${offer}`);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    if (!myStream) return;

    myStream.getTracks().forEach((track) => {
      const sender = peer.peer.getSenders().find((s) => s.track && s.track.kind === track.kind);
      if (sender) {
        // If there's an existing sender, replace it with the new track
        sender.replaceTrack(track);
      } else {
        peer.peer.addTrack(track, myStream);
      }
    });
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log(`Call accepted from ${from} with answer ${ans}`);
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", (event) => {
      const remoteStream = event.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleJoinRoom);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    return () => {
      socket.off("user:joined", handleJoinRoom);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [socket, handleJoinRoom, handleIncomingCall, handleCallAccepted, handleNegoNeedIncomming, handleNegoNeedFinal]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
    <h1 className="text-2xl mb-4">Video Conference Room</h1>
    <h2 className="mb-4">{remoteSocketId ? "Connected" : "No one in room"}</h2>
    {myStream && (
      <button onClick={sendStreams} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Send Stream</button>
    )}
    {remoteSocketId && (
      <button onClick={handleCallUser} className="bg-green-500 text-white px-4 py-2 rounded mb-4">Call User</button>
    )}
    <div className="flex w-full h-full">
      {myStream && (
        <div className="flex-1 h-full">
          <h1 className="text-lg text-center">My Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100%"
            width="100%"
            url={myStream}
            className="object-cover"
          />
        </div>
      )}
      {remoteStream && (
        <div className="flex-1 h-full">
          <h1 className="text-lg text-center">Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100%"
            width="100%"
            url={remoteStream}
            className="object-cover"
          />
        </div>
      )}
    </div>
  </div>
  );
}

export default Home;
