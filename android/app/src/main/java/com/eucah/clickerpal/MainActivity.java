package com.sncf.androidenterprise.internal.essaiscontinuite;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothClassicPlugin.class);
        registerPlugin(AndroidKeepAwakePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
