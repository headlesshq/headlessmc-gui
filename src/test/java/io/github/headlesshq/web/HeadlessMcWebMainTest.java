package io.github.headlesshq.web;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class HeadlessMcWebMainTest {
    private static final String KEY = "hmc.web.test.parse.key";
    private static final String EMPTY = "hmc.web.test.parse.empty";
    private static final String JVM = "hmc.web.test.parse.jvm";

    @AfterEach
    void clearProperties() {
        System.clearProperty(KEY);
        System.clearProperty(EMPTY);
        System.clearProperty(JVM);
    }

    @Test
    void leadingSystemPropertiesAreParsedAndRemoved() {
        String[] result = HeadlessMcWebMain.parseSystemProperties(new String[]{"-D" + KEY + "=a=b", "-D" + EMPTY});

        assertArrayEquals(new String[0], result);
        assertEquals("a=b", System.getProperty(KEY));
        assertEquals("", System.getProperty(EMPTY));
    }

    @Test
    void systemPropertiesAfterTheFirstArgumentAreKept() {
        String[] result = HeadlessMcWebMain.parseSystemProperties(new String[]{
            "-D" + KEY + "=value", "launch", "--jvm", "-D" + JVM + "=value", "26.1"
        });

        assertArrayEquals(new String[]{"launch", "--jvm", "-D" + JVM + "=value", "26.1"}, result);
        assertEquals("value", System.getProperty(KEY));
        assertNull(System.getProperty(JVM));
    }

}
