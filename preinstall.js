const fs = require('fs');

if (process.env.GCP_CONFIG_FILE && process.env.GCP_CREDENTIALS) {

    fs.writeFile(process.env.GCP_CONFIG_FILE, process.env.GCP_CREDENTIALS, (err) => {});
    
    console.log('GCP config written! ');
} else {
    console.log('Env vars not present, GCP config not created');
}
