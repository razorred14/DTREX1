import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import BrowseTrades from "./pages/BrowseTrades";
import CreateTrade from "./pages/CreateTrade";
import MyTrades from "./pages/MyTrades";
import TradeDetail from "./pages/TradeDetail";
import MakeOffer from "./pages/MakeOffer";
import ContactsPage from "./pages/Contacts";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

const client = new QueryClient();

const router = createBrowserRouter([
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Home />
      </div>
    ),
  },
  {
    path: "/trades",
    element: (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <BrowseTrades />
      </div>
    ),
  },
  {
    path: "/trade/:id",
    element: (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <TradeDetail />
      </div>
    ),
  },
  {
    path: "/trade/:id/offer",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <MakeOffer />
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
          <CreateTrade />
        </div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/my-trades",
    element: (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <MyTrades />
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
