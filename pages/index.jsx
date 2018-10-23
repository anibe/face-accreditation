import Link from 'next/link';

const Home = () => (
    <div>
        <h1>Home 🏠</h1>
        <p>Powered by Next.js. Running on <strong>{process.env.NODE_ENV}</strong> environment.</p>
        <ul>
            <li><Link href="/playground"><a>Playground</a></Link></li>
            <li><Link href="/voters"><a>Voters</a></Link></li>
        </ul>
    </div>
)

export default Home;