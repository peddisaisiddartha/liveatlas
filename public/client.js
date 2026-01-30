const socket = io();
const roomId = "liveatlas-room";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");
const roleTag = document.getElementById("roleTag");

const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");
const endBtn = document.getElementById("endBtn");

let localStream;
let peerConnection;
let micEnabled = true;
let camEnabled = true;
let role = "unknown";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
  socket.emit("join-room", roomId);
}

socket.on("user-joined", async () => {
  // Someone joined AFTER you → you are GUIDE
  role = "guide";
  roleTag.innerText = "GUIDE";
  statusText.innerText = "Tourist joined";

  await createPeer(true);
});

socket.on("offer", async (offer) => {
  // You received an offer → you are TOURIST
  role = "tourist";
  roleTag.innerText = "TOURIST";
  statusText.innerText = "Connecting to guide…";

  await createPeer(false);
  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { roomId, answer });
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(answer);
  statusText.innerText = "Connected";
});

socket.on("ice-candidate", async (candidate) => {
  if (candidate) {
    await peerConnection.addIceCandidate(candidate);
  }
});

async function createPeer(isCaller) {
  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track =>
    peerConnection.addTrack(track, localStream)
  );

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        candidate: event.candidate
      });
    }
  };

  if (isCaller) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { roomId, offer });
  }
}

/* UI Controls */

micBtn.onclick = () => {
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  micBtn.innerText = micEnabled ? "Mute" : "Unmute";
};

camBtn.onclick = () => {
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
  camBtn.innerText = camEnabled ? "Camera Off" : "Camera On";
};

endBtn.onclick = () => {
  statusText.innerText = "Call ended";
  peerConnection && peerConnection.close();
  localStream.getTracks().forEach(t => t.stop());
};

start().catch(err => {
  alert("Camera/Mic error: " + err.message);
});
