import Link from 'next/link';
import Datastore from '@google-cloud/datastore';

// Your Google Cloud Platform project ID
const projectId = 'face-accreditation';
 
// Creates a client
const datastore = new Datastore({
  projectId: projectId
});

const votersQuery = datastore
    .createQuery('Register')
        .order('VIN', {
            descending: true,
        });       

let voters = '';

datastore.runQuery(votersQuery).then(results => {
    voters = results[0];
    console.log(voters);
    console.log('Voters:');
    voters.forEach((voter) => {
        console.log(voter['Full name']);
        voters += `\n${voter['Full name']}`;
    });
});

const Playground = () => (
    <div>
        <h1>Playground 🎮</h1>
        <p>This is the playground!</p>
        <Link href="/"><a>&laquo; Home</a></Link>
        <hr/>
        <h2>Voters Register</h2>
        <div>
            {voters}
        </div>
    </div>
)

export default Playground;