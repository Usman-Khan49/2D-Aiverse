import { Show, SignInButton, SignOutButton, UserButton } from '@clerk/react'
import './App.css'

function App() {
  return(<>
    
    <Show when="signed-in">
    <div>
      You have been logged in successfully! You can now access the protected content of the app.
    </div>
      <UserButton/>
    </Show>
    <Show when="signed-out">
      <div>
        Please sign in to access the protected content of the app.
      </div>
      <SignInButton></SignInButton>
      <SignOutButton></SignOutButton>
    </Show>
  
  </>)
}

export default App
