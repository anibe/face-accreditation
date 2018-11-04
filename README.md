# FaceValidate
AI Powered face recognition web app that can be used to verify voters for elections. Submitted as part of the [BTNG Election Hackathon 2018](https://devpost.com/software/rapid-fraud-prevention-using-ai).

## Developing
### Prerequisites

1. Node.js (v 6+)
1. Google Cloud Platform SDK
1. An API key from [Microsoft Azure Face API](https://docs.microsoft.com/en-us/azure/cognitive-services/face/overview)
1. A [Google Cloud Platform Datastore](https://cloud.google.com/datastore/) account. Data schema to be covered below
1. Depending on your hosting environment, a number of environment variables are required including: `GCP_CONFIG_FILE` (contains the path to GCP SDK config json file), `GCP_CREDENTIALS` (authentication details to your GCP account) and `MS_SUBSCRIPTION_KEY` (Azure API key).

### Build and running locally
1. `npm install`
1. `npm run start` to run an Express local server on port 3000
1. `npm run start-next` to run Next.js