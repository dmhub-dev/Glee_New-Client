import { Routes, Route } from 'react-router-dom'
import { Button } from '@glee/ui'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Glee</h1>
          <Button>Get Started</Button>
        </div>
      } />
    </Routes>
  )
}
