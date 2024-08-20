import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

export const metadata = {
  title: "AdFHEnture",
  description: "AdFHEnture",
};

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default App;
