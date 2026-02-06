const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

const roomId = new URLSearchParams(window.location.search).get("room") || "default";

let localStream;
let peer;

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

window.addEventListener("DOMContentLoaded", start);

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24 }
}
    });

    localVideo.srcObject = localStream;
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


