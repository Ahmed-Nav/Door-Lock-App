
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SetupLockScreen from './components/SetupLockScreen';
import PushAclScreen from './components/PushAclScreen';

function App() {

  return (
    <SafeAreaProvider>
      <SetupLockScreen />
    </SafeAreaProvider>
  );
}

export default App;
