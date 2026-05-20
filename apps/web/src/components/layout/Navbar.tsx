import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-glee-bg/80 backdrop-blur-md border-b border-border flex items-center px-6">
      <Link to="/" className="font-heading font-black text-2xl text-neon-pink tracking-tight">
        GLEE
      </Link>
    </nav>
  )
}
