import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PhoneXMarkIcon, MicrophoneIcon, VideoCameraIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/solid';
import { MicrophoneIcon as MicOff, VideoCameraSlashIcon } from '@heroicons/react/24/outline';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallModal({ socket, currentUser, targetUser, callType, isIncoming, offer, onClose }) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);

  const [status,   setStatus]   = useState(isIncoming ? 'incoming' : 'calling');
  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(callType === 'video');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (status !== 'connected') return;
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const getMedia = useCallback(async () => {
    const constraints = callType === 'video' ? { video: true, audio: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [callType]);

  const createPC = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtc_ice_candidate', { targetUserId: targetUser._id, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) hangup();
    };
    return pc;
  }, [socket, targetUser]);

  useEffect(() => {
    if (isIncoming) return;
    (async () => {
      try {
        const stream = await getMedia();
        const pc = createPC(stream);
        const sdpOffer = await pc.createOffer();
        await pc.setLocalDescription(sdpOffer);
        socket.emit('call_invite',  { targetUserId: targetUser._id, callType });
        socket.emit('webrtc_offer', { targetUserId: targetUser._id, offer: sdpOffer });
      } catch (err) { console.error(err); setStatus('failed'); }
    })();
  }, []);

  const acceptCall = useCallback(async () => {
    try {
      setStatus('connecting');
      socket.emit('call_accept', { targetUserId: targetUser._id });
      const stream = await getMedia();
      const pc = createPC(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { targetUserId: targetUser._id, answer });
    } catch (err) { console.error(err); setStatus('failed'); }
  }, [offer, getMedia, createPC, socket, targetUser]);

  useEffect(() => {
    if (!socket) return;
    socket.on('call_rejected', () => { setStatus('rejected'); setTimeout(onClose, 2000); });
    socket.on('call_ended',    () => { setStatus('ended');    setTimeout(onClose, 1500); });
    socket.on('webrtc_answer', async ({ answer }) => {
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus('connected');
    });
    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (pcRef.current) try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    return () => {
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
    };
  }, [socket, onClose]);

  const hangup = useCallback(() => {
    socket.emit('call_end', { targetUserId: targetUser._id });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    onClose();
  }, [socket, targetUser, onClose]);

  const rejectCall = useCallback(() => {
    socket.emit('call_reject', { targetUserId: targetUser._id });
    onClose();
  }, [socket, targetUser, onClose]);

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(v => !v); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(v => !v); }
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg,#0b1120 0%,#0c4a6e 60%,#0369a1 100%)', minHeight: '420px' }}>

        {callType === 'video' && status === 'connected' && (
          <video ref={remoteVideoRef} autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}

        <div className="relative z-10 p-8 flex flex-col items-center gap-6 min-h-96 justify-between">
          <div className="flex flex-col items-center gap-3 mt-4">
            {targetUser?.avatar
              ? <img src={targetUser.avatar} alt={targetUser.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20 shadow-xl" />
              : <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 ring-white/20"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
                  {initials(targetUser?.name)}
                </div>
            }
            <div className="text-center">
              <p className="text-white font-bold text-xl">{targetUser?.name}</p>
              <p className="text-sky-300 text-sm mt-1">
                {status === 'incoming'   && `Incoming ${callType} call…`}
                {status === 'calling'    && 'Calling…'}
                {status === 'connecting' && 'Connecting…'}
                {status === 'connected'  && fmt(duration)}
                {status === 'rejected'   && 'Call rejected'}
                {status === 'ended'      && 'Call ended'}
                {status === 'failed'     && 'Call failed — check camera/mic permissions'}
              </p>
            </div>
          </div>

          {callType === 'video' && status === 'connected' && (
            <video ref={localVideoRef} autoPlay playsInline muted
              className="absolute bottom-24 right-6 w-28 h-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg" />
          )}

          <div className="flex items-center gap-4 pb-2">
            {status === 'incoming' ? (
              <>
                <button onClick={rejectCall}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  <PhoneXMarkIcon className="w-7 h-7 text-white" />
                </button>
                <button onClick={acceptCall}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  {callType === 'video' ? <VideoCameraIcon className="w-7 h-7 text-white" /> : <SpeakerWaveIcon className="w-7 h-7 text-white" />}
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleMic}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 ${micOn ? 'bg-white/20' : 'bg-red-500'}`}>
                  {micOn ? <MicrophoneIcon className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
                </button>
                <button onClick={hangup}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  <PhoneXMarkIcon className="w-7 h-7 text-white" />
                </button>
                {callType === 'video' && (
                  <button onClick={toggleCam}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 ${camOn ? 'bg-white/20' : 'bg-red-500'}`}>
                    {camOn ? <VideoCameraIcon className="w-5 h-5 text-white" /> : <VideoCameraSlashIcon className="w-5 h-5 text-white" />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}