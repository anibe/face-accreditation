module.exports = {
    webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
      // Perform customizations to webpack config
      // Important: return the modified config
      config.target = 'node';
      return config
    }
  }