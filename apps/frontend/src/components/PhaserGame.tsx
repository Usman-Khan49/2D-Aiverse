import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: "100%",
      height: "100%",
      backgroundColor: "#2c3e50", // A nice slate grey
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: {
        preload: preload,
        create: create,
        update: update,
      },
    };

    function preload(this: Phaser.Scene) {
      // Future asset loading
    }

    function create(this: Phaser.Scene) {
      // Future character initialization
      console.log("Phaser Scene Created");
    }

    function update(this: Phaser.Scene) {
      // Future game loop logic
    }

    // Initialize the game
    gameRef.current = new Phaser.Game(config);

    // Clean up on unmount
    return () => {
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
