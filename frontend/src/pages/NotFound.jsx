import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

function NotFound() {
  return (
    <main className="py-12 lg:py-20">
      <div className="max-w-md mx-auto px-6 lg:px-8 text-center">
        <h1 className="text-6xl lg:text-7xl font-semibold text-primary tracking-tight mb-4">
          404
        </h1>
        <p className="text-xl text-secondary mb-8">
          Page not found
        </p>
        <Link to="/">
          <Button>
            Back to home
          </Button>
        </Link>
      </div>
    </main>
  )
}

export default NotFound