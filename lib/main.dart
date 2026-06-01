import 'package:bnpl/modules/authentication/views/enter_pin_view.dart';
import 'package:bnpl/modules/authentication/views/login_view.dart';
import 'package:bnpl/modules/authentication/views/onboarding_view.dart';
import 'package:bnpl/modules/dashboard/views/dashboard_view.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await Firebase.initializeApp();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 
      },
    );
  }
}

// Small widget that checks auth and redirects
class AuthChecker extends StatelessWidget {
  const AuthChecker({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      },
    );
  }
}
