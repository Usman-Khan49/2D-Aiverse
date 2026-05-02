import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { MainScene } from "../game/scenes/MainScene";

export function PhaserGame({ socket }: { socket?: WebSocket | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const socketRef = useRef<WebSocket | null>(socket || null);

  // Update ref and scene when prop changes
  useEffect(() => {
    socketRef.current = socket || null;
    if (gameRef.current && socket) {
      const scene = gameRef.current.scene.getScene("MainScene") as MainScene;
      if (scene && typeof scene.updateSocket === "function") {
        scene.updateSocket(socket);
      }
    }
  }, [socket]);


  useEffect(() => {
    if (!containerRef.current) return;

    // Game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#1a1a2e",
      pixelArt: true,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [MainScene],
    };

    // Initialize the game
    gameRef.current = new Phaser.Game(config);

    // Pass the socket to the scene
    gameRef.current.scene.start("MainScene", { socket: socketRef.current });

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    // Clean up on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      id="phaser-container"
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1, // Ensure it stays behind UI
        backgroundColor: "#2c3e50",
      }}
    />
  );
}
