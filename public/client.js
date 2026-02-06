const socket = io();

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") || "expo";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

let localStream;
let peer;

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
  socket.emit("join-room", roomId);
}

socket.on("user-joined", async () => {
  statusText.innerText = "User joined. Calling…";
  await createPeer(true);
});

socket.on("offer", async offer => {
  statusText.innerText = "Incoming call…";
  await createPeer(false);
  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit("answer", { roomId, answer });
});

socket.on("answer", async answer => {
  await peer.setRemoteDescription(answer);
  statusText.innerText = "Connected";
});

socket.on("ice-candidate", async candidate => {
  if (candidate) await peer.addIceCandidate(candidate);
});

async function createPeer(isCaller) {
  peer = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track =>
    peer.addTrack(track, localStream)
  );

  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        candidate: e.candidate
      });
    }
  };

  if (isCaller) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", { roomId, offer });
  }
}

init().catch(err => {
  alert("Camera/Mic error: " + err.message);
});
