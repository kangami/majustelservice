import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Services from './pages/Services.jsx'
import Contact from './pages/Contact.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import CheckoutResult from './pages/CheckoutResult.jsx'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/checkout/success" element={<CheckoutResult />} />
          <Route path="/checkout/cancel" element={<CheckoutResult />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
