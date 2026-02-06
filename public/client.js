const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

const roomId = new URLSearchParams(window.location.search).get("room") || "default";

let localStream;
let peer;
let useBackCamera = false;
const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

window.addEventListener("DOMContentLoaded", start);

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: useBackCamera ? {exact: "environment"}: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24 }
}
    });

    localVideo.srcObject = localStream;
    localVideo.style.display = "none";
    socket.emit("join-room", roomId);
    statusText.innerText = "Camera ready";

  } catch (err) {
    console.error(err);
    statusText.innerText = "Camera permission failed";
  }
}

socket.on("user-joined", async () => {
  statusText.innerText = "User joined. Calling...";
  await createPeer(true);
});

socket.on("offer", async ({offer}) => {
  await createPeer(false);
  await peer.setRemoteDescription(new
    RTCSessionDescription(offer));

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { roomId, answer });
});

socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(new
    RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate) => {
  if(peer && candidate){
  await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

async function createPeer(isCaller) {
  peer = new RTCPeerConnection(rtcConfig);


  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
});

peer.getSenders().forEach(sender => {
  if (sender.track && sender.track.kind === "video") {
    const params = sender.getParameters();
    if (!params.encodings) params.encodings = [{}];

    params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
    params.encodings[0].priority = "high";

    sender.setParameters(params);
  }
});

  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        candidate: event.candidate
      });
    }
  };

  if (isCaller) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", { roomId, offer });
  }
}
document.getElementById("camBtn").onclick = async () => {
  useBackCamera = !useBackCamera;

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
  }

  await start();
};
// 🔇 MUTE / UNMUTE MIC
document.getElementById("muteBtn").onclick = () => {
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) return;

  audioTrack.enabled = !audioTrack.enabled;
  document.getElementById("muteBtn").innerText =
    audioTrack.enabled ? "🔇 Mute" : "🔊 Unmute";
};

// 📷 CAMERA ON / OFF
document.getElementById("camBtn").onclick = () => {
  if (!localStream) return;

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return;

  videoTrack.enabled = !videoTrack.enabled;
  document.getElementById("camBtn").innerText =
    videoTrack.enabled ? "📷 Camera" : "🚫 Camera Off";
};

// ❌ END SESSION (SAFE CLOSE)
document.getElementById("endBtn").onclick = () => {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
  }

  if (peer) {
    peer.close();
  }

  statusText.innerText = "Session ended";
};

document.getElementById("endBtn").onclick = () => {
  window.location.href = "/";
};
