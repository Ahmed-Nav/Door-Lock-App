
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ClaimLockScreen from './components/ClaimLockScreen';
// import OwnershipScreen from './components/OwnershipScreen';
// import PushAclScreen from './components/PushAclScreen';
// import UnlockScreen from './components/UnlockScreen';
import 'react-native-get-random-values';

function App() {

  return (
    <SafeAreaProvider>
      <ClaimLockScreen />
    </SafeAreaProvider>
  );
}

export default App;
