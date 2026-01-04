import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import CreateContract from "./pages/CreateContract";
import ViewContracts from "./pages/ViewContracts";
import ContactsPage from "./pages/Contacts";
import Wallet from "./pages/Wallet";
import WalletView from "./pages/WalletView";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

const client = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/wallet-view",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <WalletView />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Home />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/create",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <CreateContract />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/contracts",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <ViewContracts />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/contacts",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <ContactsPage />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/wallet",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Wallet />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Settings />
        </div>
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} future={{ v7_relativeSplatPath: true, v7_startTransition: true }} />
      </QueryClientProvider>
    </AuthProvider>
  </React.StrictMode>
);
