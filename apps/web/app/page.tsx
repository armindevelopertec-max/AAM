import Image from "next/image";



export default async function Home() {
  const response = await fetch('http://localhost:3001/hello')
  const data = await response.json()
  return (
    <main>
      <h1> Next.js + NestJS</h1>

      <p>{data.message}</p>
    </main>
  );
}
