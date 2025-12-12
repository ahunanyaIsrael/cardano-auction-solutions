import { useState } from "react";
import upload from "../../assets/images/upload.png";
import "./Create.css";
import { useLucid } from "../../context/LucidContext";
import { createAuction } from "../../utils/function";

const Create = () => {
  const { lucid, address } = useLucid();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    minBid: "",
    description: "",
    deadline: "",
    image: null,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    createAuction(lucid, address, setLoading, formData, setFormData);
  };
  return (
    <div className="create-auction" onSubmit={handleSubmit}>
      <h4>Welcome to Cardano Auction Solutions.</h4>
      <div className="main">
        <div className="auction-heading">
          <h1>Create Auction</h1>
          <div></div>
          <div id="small"></div>
        </div>

        <form className="create-auction-form">
          <input
            type="text"
            name="title"
            placeholder="Property Title *"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
          <input
            type="number"
            name="minBid"
            placeholder="Minimum Starting Bid (in ADA)"
            value={formData.minBid}
            onChange={handleInputChange}
            min="1"
            step="0.1"
          />
          <textarea
            name="description"
            placeholder="Property Description *"
            rows={10}
            value={formData.description}
            onChange={handleInputChange}
            required
          />
          <input
            type="datetime-local"
            name="deadline"
            placeholder="Deadline *"
            value={formData.deadline}
            onChange={handleInputChange}
            id="decrease"
            required
            min={new Date().toISOString().slice(0, 16)}
          />
          <div className="upload">
            <input
              type="file"
              hidden
              id="image"
              accept="image/*"
              onChange={handleFileChange}
            />
            <label htmlFor="image" className="upload-img">
              {formData.image ? (
                <img
                  className="selected-image"
                  src={URL.createObjectURL(formData.image)}
                />
              ) : (
                <img src={upload} alt="Upload" id="upload_image" />
              )}
            </label>
          </div>
          <button type="submit" disabled={loading || !lucid}>
            {loading ? "Creating Auction..." : "Create Auction"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Create;
