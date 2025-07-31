/**
*    Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
*    
*    Licensed under the Apache License, Version 2.0 (the "License");
*    you may not use this file except in compliance with the License.
*    You may obtain a copy of the License at
*    
*      http://www.apache.org/licenses/LICENSE-2.0
*    
*    Unless required by applicable law or agreed to in writing, software
*    distributed under the License is distributed on an "AS IS" BASIS,
*    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*    See the License for the specific language governing permissions and
*    limitations under the License.
*/

package de.movabo.carbonfootprintapi.cli;

import lombok.Getter;
import lombok.NonNull;
import org.apache.commons.cli.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.Arrays;

/**
 * cli arguments and options of the API server
 */
@Service
public class ParsedArguments {
    private static final Logger logger = LogManager.getLogger(ParsedArguments.class);
    /**
     * Options of the API server
     */
    private final Options options;

    /**
     * aasx-files to load/supplied by the cli
     */
    @Getter
    private File[] aasxFiles = {};

    /**
     * aas-files to load/supplied by the cli
     */
    @Getter
    private File[] aasFiles = {};

    /**
     * port to run the server on
     */
    @Getter
    private int port = 8080;

    /**
     * CORS allowed origins
     */
    @Getter
    private String cors = null;

    /**
     * Directory path of static resources to serve
     */
    @Getter
    private String staticResources = null;

    /**
     * (relative) resource file to server in case a 404 error occurs
     */
    @Getter
    private String notFoundResource = null;

    /**
     * Whether to suppress a 404 error and return 200 if notFoundFile was sent
     */
    @Getter
    private boolean suppress404 = false;

    /**
     * Last exception (to print a help-message if cli was used wrongly)
     */
    private ParseException lastException = null;

    /**
     * Arguments which were supplied from the cli
     */
    private final String[] applicationArguments;

    /**
     * Parse arguments from ApplicationArguments
     * @param applicationArguments application arguments to parse
     * @throws ParseException Error while parsing
     */
    @Autowired
    public ParsedArguments(ApplicationArguments applicationArguments) throws ParseException {
        this(applicationArguments.getSourceArgs());
    }


    /**
     * Parse arguments from ApplicationArguments
     * @param args arguments to parse
     * @throws ParseException Error while parsing
     */
    public ParsedArguments(String[] args) throws ParseException {
        this.applicationArguments = args;
        options = new Options();
        Option help = new Option("h", "help", false, "Print this help message");
        Option port = Option.builder()
                .longOpt("port")
                .hasArg()
                .desc("Port to run the server on")
                .build();
        Option cors = Option.builder()
                .longOpt("cors")
                .hasArg()
                .desc("Allowed cors origins")
                .build();
        Option aas = Option.builder()
                .longOpt("aas")
                .hasArg()
                .valueSeparator(',')
                .desc("Aas-files to add to the lookup repository, can be used multiple times")
                .build();
        Option checkReposNotEmpty = Option.builder()
                .longOpt("checkReposNotEmpty")
                .hasArg(false)
                .desc("When using --aas and --aasx, check whether it matches at least one file and otherwise exit")
                .build();
        Option aasx = Option.builder()
                .longOpt("aasx")
                .hasArg()
                .desc("Aasx-files to add to the lookup repository, can be used multiple times")
                .build();
        Option staticResources = Option.builder()
                .longOpt("static")
                .hasArg()
                .desc("Static resources to serve")
                .build();
        Option notFoundResource = Option.builder()
                .longOpt("notFoundResource")
                .hasArg()
                .desc("Relative path of a file inside the static resources directory (specified with --static) to serve when a 404 error occurs, should start with a /. E.g. /index.html for SPAs.")
                .build();
        Option suppress404 = Option.builder()
                .longOpt("suppress404")
                .hasArg(false)
                .desc("Suppress a 404 return value if notFoundFile is being served (useful for SPAs)")
                .build();
        options.addOption(help);
        options.addOption(port);
        options.addOption(cors);
        options.addOption(aas);
        options.addOption(aasx);
        options.addOption(checkReposNotEmpty);
        options.addOption(staticResources);
        options.addOption(notFoundResource);
        options.addOption(suppress404);
        parse(null);
    }

    /**
     * Parse arguments
     * @param args Arguments to parse. {@code this.applicationArguments.getSourceArgs()} if null.
     * @throws ParseException Error while parsing.
     */
    public void parse(String[] args) throws ParseException {
        if (args == null) {
            args = applicationArguments;
        }
        CommandLineParser parser = new DefaultParser();
        try {
            CommandLine cmd = parser.parse(options, args);

            if (cmd.hasOption("help")) {
                this.printHelp(0);
            }
            if (cmd.hasOption("aas")) {
                aasFiles = getFiles(cmd.getOptionValues("aas"), cmd.hasOption("checkReposNotEmpty"));
                logger.info("AAS-files to load: " + Arrays.toString(aasFiles));
            }
            if (cmd.hasOption("aasx")) {
                aasxFiles = getFiles(cmd.getOptionValues("aasx"), cmd.hasOption("checkReposNotEmpty"));
                logger.info("AASX-files to load: " + Arrays.toString(aasxFiles));
            }
            if (cmd.hasOption("port")) {
                port = Integer.parseInt(cmd.getOptionValue("port"));
            }
            if (cmd.hasOption("cors")) {
                cors = cmd.getOptionValue("cors");
            }
            if (cmd.hasOption("static")) {
                staticResources = cmd.getOptionValue("static");
            }
            if (cmd.hasOption("notFoundResource")) {
                if (staticResources == null) {
                    throw new ParseException("--notFoundResource requires --static being set.");
                }
                notFoundResource = cmd.getOptionValue("notFoundResource");
            }
            if (cmd.hasOption("suppress404")) {
                if (notFoundResource == null) {
                    throw new ParseException("--suppress404 requires --notFoundResource being set.");
                }
                suppress404 = true;
            }
        } catch (ParseException e) {
            lastException = e;
            throw e;
        }
    }

    /**
     * Print the help text
     * @param exit Exit code the exit the program with. Does not exit if null.
     */
    public void printHelp(Integer exit) {
        this.printHelp(exit, null);
    }

    /**
     * Print the help text
     * @param exit Exit code the exit the program with. Does not exit if null.
     * @param additionalMessage Additional message to append to the help message.
     */
    public void printHelp(Integer exit, String additionalMessage) {
        HelpFormatter formatter = new HelpFormatter();
        formatter.printHelp("CarbonFootprintApiApplication", options);
        if (additionalMessage != null) {
            System.out.println("\n" + additionalMessage);
        } else if (lastException != null) {
            System.out.println("\n" + "Error parsing arguments: " + lastException.getMessage());
        }
        if (exit != null) {
            System.exit(exit);
        }
    }

    /**
     * Convert glob paths to actual files
     * @param globPaths Glob paths to convert
     * @param checkGlobPathMatches Whether to check if every glob path matches at least one file and if not throw a ParseException
     * @return actual files
     * @throws ParseException Could not process the glob paths since some files/dirs in the glob path do not exist
     */
    @NotNull
    private static File[] getFiles(@NonNull String[] globPaths, boolean checkGlobPathMatches) throws ParseException {
        ArrayList<File> files = new ArrayList<>();
        for (String globPath : globPaths) {
            Path[] paths = processGlobPath(globPath);
            if (paths.length == 0 && checkGlobPathMatches) {
                throw new ParseException("File " + globPath + " does not exist or match any files.");
            }
            for (Path path: paths) {
                File file = path.toFile();
                if (!file.exists() || !file.isFile() || !file.canRead()) {
                    throw new ParseException("File " + file.getAbsolutePath() + " is not a file or not readable.");
                }
                files.add(file);
            }
        }
        return files.toArray(new File[0]);
    }

    /**
     * Convert a glob pattern to actual file paths
     * @param globPattern Glob pattern to convert
     * @return actual file paths
     * @throws ParseException Could not process the glob paths since some files/dirs in the glob pattern do not exist
     */
    private static Path[] processGlobPath(String globPattern) throws ParseException {
        PathMatcher matcher = FileSystems.getDefault().getPathMatcher("glob:" + globPattern);
        Path directory = Paths.get(globPattern.substring(0, globPattern.lastIndexOf('/')));
        ArrayList<Path> paths = new ArrayList<>();
        try (DirectoryStream<Path> pathStream = Files.newDirectoryStream(directory, matcher::matches)) {
            for (Path path : pathStream) {
                paths.add(path);
            }
        } catch (IOException | DirectoryIteratorException e) {
            throw new ParseException("Error processing files: " + e.getMessage());
        }
        return paths.toArray(new Path[0]);
    }
}
