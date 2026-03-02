import { createGlobalStyle } from "antd-style";
import {
  ConfigProvider,
  generateTheme,
  generateThemeByToken,
} from "@agentscope-ai/design";
import { BrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import "./styles/layout.css";
import "./styles/form-override.css";

const GlobalStyle = createGlobalStyle`
* {
  margin: 0;
  box-sizing: border-box;
}
`;

// Black & white theme
const bwTheme = generateThemeByToken(
  generateTheme({
    primaryHex: "#1a1a1a",
    bgBaseHex: "#ffffff",
    textBaseHex: "#1a1a1a",
    darkMode: false,
  }),
);

function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <ConfigProvider {...bwTheme} prefix="aicraw" prefixCls="aicraw">
        <MainLayout />
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
