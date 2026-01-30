const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

let pc;
let role;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

socket.on("role", r => {
  role = r;
  statusText.innerText =
    role === "caller" ? "Calling…" : "Waiting for call…";
});

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = stream;

  pc = new RTCPeerConnection(config);

  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
    statusText.innerText = "Connected";
  };

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("ice", e.candidate);
  };

  if (role === "caller") {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
  }
}

socket.on("offer", async offer => {
  if (role !== "receiver") return;

  await startCamera();
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async answer => {
  if (role !== "caller") return;
  await pc.setRemoteDescription(answer);
});

socket.on("ice", async candidate => {
  try {
    await pc.addIceCandidate(candidate);
  } catch {}
});

startCamera();
