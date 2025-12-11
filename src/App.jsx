import React from "react";
import NavBar from "./components/NavBar/NavBar";
import Create from "./pages/Create/Create";
import List from "./pages/List/List";
import { Route, Routes } from "react-router-dom";
import MyAuctions from "./pages/MyAuctions/MyAuctions";

const App = () => {
  return (
    <div className="app">
      <NavBar />
      <Routes>
        <Route path="/create" element={<Create />} />
        <Route path="/" element={<List />} />
        <Route path="/my-auctions" element={<MyAuctions />} />
      </Routes>
    </div>
  );
};

export default App;
