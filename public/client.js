const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

const roomId =
  new URLSearchParams(window.location.search).get("room") || "default";

let localStream;
let peer;
let currentFacingMode = "user";

const rtcConfig = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "a08d7dab4952ac44632adaaa",
      credential: "4+8LpWBi440BQE2K",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "a08d7dab4952ac44632adaaa",
      credential: "4+8LpWBi440BQE2K",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "a08d7dab4952ac44632adaaa",
      credential: "4+8LpWBi440BQE2K",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "a08d7dab4952ac44632adaaa",
      credential: "4+8LpWBi440BQE2K",
    },
  ],
};

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24 }
      },
      audio: true
    });

    localVideo.srcObject = localStream;
    statusText.innerText = "Camera ready";

    socket.emit("join-room", roomId);
  } catch (err) {
    console.error(err);
    statusText.innerText = "Camera permission failed";
  }
}

socket.on("user-joined", async () => {
  statusText.innerText = "User joined. Calling...";
  await createPeer(true);
});

socket.on("offer", async (offer) => {
  await createPeer(false);
  await peer.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { roomId, answer });
});

socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
  statusText.innerText = "Connected";
});

socket.on("ice-candidate", async (candidate) => {
  if (peer && candidate) {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

socket.on("room-full", () => {
  alert("Room is full. Only 2 users allowed.");
  document.getElementById("status").innerText = "Room Full";
});

async function createPeer(isCaller) {
  peer = new RTCPeerConnection(rtcConfig);

  // 🔒 Lock video bitrate for better quality
  peer.onnegotiationneeded = async () => {
    const sender = peer.getSenders().find(
      s => s.track && s.track.kind === "video"
    );

    if (sender) {
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];

      params.encodings[0].maxBitrate = 2_500_000; // 2.5 Mbps (720p stable)
      await sender.setParameters(params);
    }
  };

  localStream.getTracks().forEach((track) => {
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

start();

const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");
const switchCamBtn = document.getElementById("switchCamera");
const fsBtn = document.getElementById("fsBtn");
const endBtn = document.getElementById("endBtn");

muteBtn.onclick = () => {
  const audioTrack = localStream?.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
};

camBtn.onclick = () => {
  const videoTrack = localStream?.getVideoTracks()[0];
  if (!videoTrack) return;
  videoTrack.enabled = !videoTrack.enabled;
};

fsBtn.onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }

  fsBtn.onclick = () => {
   if (!document.fullscreenElement) {
       document.documentElement.requestFullscreen();
   } else {
       document.exitFullscreen();
   }
};

switchCamBtn.onclick = () => {
    switchCamera();
};
};

endBtn.onclick = () => {
  peer?.close();
  socket.disconnect();
  window.location.href = "/";
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.error("SW registration failed", err));
}

async function switchCamera() {
    currentFacingMode =
        currentFacingMode === "user" ? "environment" : "user";

    const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: true
    });

    const newVideoTrack = newStream.getVideoTracks()[0];

    if (peer) {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) {
            sender.replaceTrack(newVideoTrack);
        }
    }

    localStream.getTracks().forEach(track => track.stop());
    localStream = newStream;
    localVideo.srcObject = newStream;
}
