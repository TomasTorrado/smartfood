import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

function App() {

  //Initializes variables and states
  //Keeps track of user authentication, inventory items, chat messages, and UI statesah
  //use state is a react hook that stores valeus and allows for re-rendering when values change.

  const [user, setUser] = useState(null); // store logged-in users info
  const [email, setEmail] = useState(''); // Store email input
  const [password, setPassword] = useState(''); //Store password input
  const [isLogin, setIsLogin] = useState(true); // switch between login and signup mode
  const [activeTab, setActiveTab] = useState('inventory'); //controls which tab is active: inventory or chat
  
  //Inventory related states 
  const [inventory, setInventory] = useState([]); //Stores the list of items 
  const [itemName, setItemName] = useState(''); //Stores current item name input
  const [itemQuantity, setItemQuantity] = useState(''); //Stores current item quantity input 
  const [itemExpiration, setItemExpiration] = useState(''); //Stores current item expiration date input 
  
  //Chat related states 
  const [chatMessages, setChatMessages] = useState([]); //Stores chat messages
  const [chatInput, setChatInput] = useState(''); //Stores current chat input
  const [loading, setLoading] = useState(false); //shows loading spinner during async operations

  //useEffect #1: Load user data from local storage when app starts
  // Runs only once when the App component first loads ([] = run on mount only)
  useEffect(() => {
    const stored = localStorage.getItem('bullavor_user');
    if (stored) setUser(JSON.parse(stored)); // If user info was saved, restore it
  }, []);


  // useEffect #2: Fetch inventory after user logs in
  // Runs whenever "user" changes — only triggers once user is set
  useEffect(() => {
    if (user) fetchInventory(); // Only run fetchInventory if a user is logged in
  }, [user]);

  // handleAuth: Handles login or signup
  // Sends email/password to backend API and saves user data if successful
  const handleAuth = async () => {
    setLoading(true); // Show loading indicator while waiting for response
    try {
        // Choose the correct endpoint: login or signup
      const res = await fetch(`${API_URL}/auth/${isLogin ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }) // Send user credentials
      });
      const data = await res.json(); // Parse server response
      if (res.ok) {
         // Save user info in state and local storage for future sessions
        setUser(data.user);
        localStorage.setItem('bullavor_user', JSON.stringify(data.user));
      } else {
        alert(data.detail); // Show error message from server
      }
    } catch (err) {
      alert('Error: ' + err.message); // Handle network or server errors
    }
    setLoading(false); // Stop loading indicator
  };

  // Gets all the items from the backend for the logged-in user
  const fetchInventory = async () => {
    try {
      // Send a GET request to the API to get this user's inventory
      const res = await fetch(`${API_URL}/inventory/${user.uid}`);
      // Convert the response to JSON format
      const data = await res.json();
      // Update the inventory state with the data from the server
      setInventory(data);
    } catch (err) {
       // Log any errors (e.g., network issues) to the console
      console.error(err);
    }
  };

  useEffect(() => {
  if (inventory.length === 0) return;

  const today = new Date();
  const expiringSoon = inventory.filter((item) => {
    if (!item.expiration_date) return false;
    const expDate = new Date(item.expiration_date);
    const diffDays = (expDate - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 3 && diffDays >= 0; // expires in 3 days or less
  });

  if (expiringSoon.length > 0) {
    alert(`⚠️ Heads up! These items are expiring soon: ${expiringSoon.map(i => i.name).join(", ")}`);
  }
  }, [inventory]);

  //Sends a new item to the backend to be added to the inventory and then refreshes the inventory list
  const addItem = async () => {
     // Basic validation: require a name and quantity
    if (!itemName || !itemQuantity) return alert('Name and quantity required');
    setLoading(true);
    try {
      // Send a POST request to add the item to the backend
      await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,   // Associate the item with the current user
          name: itemName,     // Item name from input
          quantity: parseInt(itemQuantity),  // Convert quantity to an integer
          expiration_date: itemExpiration || null // Optional expiration date
        })
      });
      // Clear input fields after adding the item
      setItemName('');
      setItemQuantity('');
      setItemExpiration('');
      // Refresh the inventory list to include the new item
      fetchInventory();
    } catch (err) {
      alert('Error adding item');
    }
    setLoading(false);
  };

   // sendMessage: Sends a chat message and handles the response
  const sendMessage = async () => {
    //sendMessage: Sends a chat message and handles the response
    if (!chatInput.trim()) return;
    
    // Add the user's message to the chat locally (UI update)
    setChatMessages([...chatMessages, { role: 'user', content: chatInput }]);
    const msg = chatInput; // Save message before clearing input
    setChatInput(''); // Clear input field
    setLoading(true); 
    
    try {
      // Send message to backend API
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid, message: msg })  // Send user ID + message
      });
      // Convert server response to JSON
      const data = await res.json();
      // Add the assistant's response to the chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      // If there's an error, show a generic error message from assistant
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error occurred' }]);
    }
    setLoading(false); //Stop loading indicator
  };

  // Deletes an item from the inventory by its ID
  const deleteItem = async (id) => {
     try {
    // Call your backend DELETE endpoint
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        // If your backend requires auth:
        // "Authorization": `Bearer ${userToken}`
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Update local state so UI removes it immediately
    setInventory(inventory.filter((item) => item.id !== id));
  } catch (error) {
    console.error("Error deleting item:", error);
    alert("Error deleting item. Try again");
  }
};
  
  // Main UI of the app: builds and displays the interface based on current state and connects user interactions to function
  
  // Show login form if no user is logged in
  if (!user) {
    return (

      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-green-700 mb-6 text-center">Tommy pantry</h1>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              className="w-full px-4 py-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              className="w-full px-4 py-2 border rounded"
            />
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
          </div>
          <p className="text-center mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-green-600 hover:underline"
            >
              {isLogin ? 'Need an account? Sign up' : 'Have an account? Login'}
            </button>
          </p>
        </div>
      </div>
    );
  }
  // Main app UI if user is logged in
  return (
    <div className="min-h-screen bg-green-50">
      {/* Header with app name and logout */}
      <div className="bg-white shadow mb-4">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-700">Bullavor</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={() => {
                setUser(null);
                localStorage.removeItem('bullavor_user');
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-2 rounded ${activeTab === 'inventory' ? 'bg-green-600 text-white' : 'bg-white'}`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2 rounded ${activeTab === 'chat' ? 'bg-green-600 text-white' : 'bg-white'}`}
          >
            Recipe Chat
          </button>
        </div>
        {/*adds items to inventory*/}      
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Add Item</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Item name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  type="date"
                  value={itemExpiration}
                  onChange={(e) => setItemExpiration(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <button
                  onClick={addItem}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          {/*shows the inventory list*/}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Your Items</h2>
              {inventory.length === 0 ? (
                <p className="text-gray-500">No items yet</p>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item) => (
                    <div key={item.id} className="p-3 bg-green-50 rounded border">
                      <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                      {item.expiration_date && (
                        <div className="text-sm text-gray-600">
                          Expires: {new Date(item.expiration_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick ={() => deleteItem(item.id)}
                      className="text-sm text-red-600 hover:underline mt-1"
                    >
                      Delete
                    </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/*contains the chat interface*/}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recipe Helper</h2>
            <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded">
              {chatMessages.length === 0 && (
                <p className="text-gray-500 text-center">Ask me for recipe suggestions!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-3 rounded-lg max-w-xs ${
                    msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-gray-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask for recipes..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 px-3 py-2 border rounded"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;