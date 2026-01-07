// src/utils/chartSetup.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

let isRegistered = false;

export const registerChartComponents = () => {
  if (isRegistered) return;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
  );

  // 🔥 DISABLE ANIMATIONS GLOBALLY FOR PERFORMANCE
  ChartJS.defaults.animation = false;
  ChartJS.defaults.animations = {
    colors: false,
    x: false,
    y: false,
  };
  ChartJS.defaults.transitions = {
    active: {
      animation: {
        duration: 0,
      },
    },
  };

  isRegistered = true;
  // console.log("✅ Chart.js components registered with animations disabled");
};
