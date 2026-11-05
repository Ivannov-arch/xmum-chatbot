import { useEffect } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import Home from "./app/page";
import AdminLayout from "./app/admin/layout";
import AdminHome from "./app/admin/page";
import AdminLogin from "./app/admin/login/page";
import Knowledge from "./app/admin/knowledge/page";
import Logs from "./app/admin/logs/page";
import Suggestions from "./app/admin/suggestions/page";
import { ErrorBoundary } from "./components/error-boundary";

function Pages() {
  const [location] = useLocation();
  useEffect(() => {
    const labels: Record<string, string> = {
      "/admin": "Dashboard", "/admin/login": "Admin Login",
      "/admin/knowledge": "Knowledge Base", "/admin/logs": "Conversation Logs",
      "/admin/suggestions": "Suggestions",
    };
    document.title = `${labels[location] ? labels[location] + " | " : ""}XMUM Campus Assistant`;
  }, [location]);
  return <ErrorBoundary resetKey={location}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/:rest*">
        <AdminLayout>
          <Switch>
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin/knowledge" component={Knowledge} />
            <Route path="/admin/logs" component={Logs} />
            <Route path="/admin/suggestions" component={Suggestions} />
            <Route path="/admin" component={AdminHome} />
            <Route><p>Page not found.</p></Route>
          </Switch>
        </AdminLayout>
      </Route>
      <Route><p>Page not found. <a href="/">Return to chat</a></p></Route>
    </Switch>
  </ErrorBoundary>;
}

export default function App() {
  return <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Pages /></Router>;
}
