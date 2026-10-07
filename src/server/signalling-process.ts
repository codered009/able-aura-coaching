import { startSignallingServer } from "./signalling-hub";

const port = Number(process.env.SIGNAL_PORT ?? 43124);
startSignallingServer(port);
