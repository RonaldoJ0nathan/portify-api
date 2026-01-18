export default () => ({
  app: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    env: process.env.NODE_ENV || 'development',
  },
});
