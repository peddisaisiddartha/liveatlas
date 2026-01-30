const socket = io();
const roomId = "liveatlas-room";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

let localStream;
let peerConnection;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
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
  statusText.innerText = "User joined. Calling…";
  await createPeer(true);
});

socket.on("offer", async (offer) => {
  statusText.innerText = "Incoming call…";
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

start().catch(err => {
  alert("Error accessing camera/mic: " + err.message);
});
