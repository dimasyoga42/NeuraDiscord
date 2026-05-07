const queues = new Map();

export const getQueue = (guildId) => {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      playing: false,
    });
  }

  return queues.get(guildId);
};

export const deleteQueue = (guildId) => {
  queues.delete(guildId);
};
