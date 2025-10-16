import ReactDOM from "react-dom/client";
import App from "./App";
import "./main.css";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);  // Assuming <App /> is your root component

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   // <React.StrictMode>
//     <App />
//   // </React.StrictMode>
// );
