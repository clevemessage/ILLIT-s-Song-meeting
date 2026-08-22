(function attachGameUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GameUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameUtils() {
  function isOutsideBounds(position, card, field, topMargin = 0, bottomMargin = 0) {
    return (
      position.x > field.width ||
      position.x + card.width < 0 ||
      position.y > field.height + bottomMargin ||
      position.y + card.height < -topMargin
    );
  }

  function isIntersectingBounds(position, card, field, topMargin = 0, bottomMargin = 0) {
    return !(
      position.x >= field.width ||
      position.x + card.width <= 0 ||
      position.y >= field.height + bottomMargin ||
      position.y + card.height <= -topMargin
    );
  }

  function oppositeSide(side) {
    return {
      left: "right",
      right: "left",
      top: "bottom",
      bottom: "top",
    }[side];
  }

  function createRespawnPlan(options) {
    const {
      exitSide,
      fieldWidth,
      fieldHeight,
      cardWidth,
      cardHeight,
      level,
      mascotCount,
      random = Math.random,
    } = options;

    const spawnSide = oppositeSide(exitSide) || "left";
    const speed = 90 + level * 20 + random() * 90;
    const verticalSpeed = (0.18 + random() * 0.56) * speed;
    const horizontalSpeed = (0.55 + random() * 0.45) * speed;
    const insetX = Math.max(0, fieldWidth - cardWidth);
    const insetY = Math.max(0, fieldHeight - cardHeight);
    const gap = 12;
    let x = random() * insetX;
    let y = random() * insetY;
    let vx = (random() > 0.5 ? 1 : -1) * horizontalSpeed;
    let vy = (random() > 0.5 ? 1 : -1) * verticalSpeed;

    if (spawnSide === "left") {
      x = -cardWidth - gap;
      vx = Math.abs(horizontalSpeed);
    } else if (spawnSide === "right") {
      x = fieldWidth + gap;
      vx = -Math.abs(horizontalSpeed);
    } else if (spawnSide === "top") {
      y = -cardHeight - gap;
      vy = Math.abs(verticalSpeed);
    } else {
      y = fieldHeight + gap;
      vy = -Math.abs(verticalSpeed);
    }

    return {
      spawnSide,
      x,
      y,
      vx,
      vy,
      mascotIndex: Math.min(mascotCount - 1, Math.floor(random() * mascotCount)),
      pathType: random() > 0.42 ? "curve" : "line",
      curveX: 5 + random() * 16,
      curveY: 7 + random() * 20,
      phase: random() * Math.PI * 2,
      phaseSpeed: 0.005 + random() * 0.009,
    };
  }

  return { createRespawnPlan, isOutsideBounds, isIntersectingBounds };
});
