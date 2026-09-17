import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import './App.css'

function App() {
  return (
    <header>
      <SignedOut >
        <SignInButton  mode='modal'/>
        <SignUpButton mode='modal'/>
      </SignedOut>
      <SignedIn >
        <UserButton />
      </SignedIn>
    </header>
  )
}

export default App