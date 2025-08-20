
import { SafeAreaProvider } from 'react-native-safe-area-context';
import UnlockScreen from './components/UnlockScreen';

function App() {

  return (
    <SafeAreaProvider>
      <UnlockScreen />
    </SafeAreaProvider>
  );
}

export default App;
