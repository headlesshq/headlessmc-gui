package io.github.headlesshq.web;

import io.github.headlesshq.headlessmc.java.args.ArgPair;
import io.github.headlesshq.headlessmc.java.args.SystemPropertyUtil;
import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.annotations.QuarkusMain;

import java.util.ArrayList;
import java.util.List;

/**
 * Explicit main, otherwise quarkus-picocli (needed to make HeadlessMc's commands CDI beans)
 * would run the HeadlessMc command line as application and exit, instead of serving the web ui.
 */
@QuarkusMain
public class HeadlessMcWebMain {
    public static void main(String... args) {
        Quarkus.run(parseSystemProperties(args));
    }

    /**
     * Sets the leading {@code -Dkey=value} arguments as system properties and returns the remaining arguments,
     * like HeadlessMc's {@code HeadlessMcMain}. The native image is built with {@code -H:-ParseRuntimeOptions},
     * because GraalVM would parse system properties from anywhere in the arguments, also from those meant for
     * the game, e.g. {@code launch --jvm -Dkey=value} (https://github.com/headlesshq/headlessmc/issues/420).
     *
     * @param args the arguments of the application.
     * @return the arguments following the leading system properties.
     */
    static String[] parseSystemProperties(String[] args) {
        boolean argsStarted = false;
        List<String> actualArgs = new ArrayList<>(args.length);
        for (String arg : args) {
            if (!argsStarted && SystemPropertyUtil.isSystemProperty(arg)) {
                ArgPair pair = SystemPropertyUtil.parseSystemProperty(arg);
                System.setProperty(pair.arg(), pair.value() == null ? "" : pair.value());
                continue;
            }

            argsStarted = true;
            actualArgs.add(arg);
        }

        return actualArgs.toArray(new String[0]);
    }

}
