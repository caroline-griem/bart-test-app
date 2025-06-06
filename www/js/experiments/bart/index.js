(function() {
   
    function run(jsPsych) {

        const timeline = [];
       
        let USDollar = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        let num_trials = 5; // Default number of trials
        let currency_unit_per_pump = .01; //Eg, $.01 per pump
        let max_pumps = 20; // Maximum pumps before explosion
        let min_pumps = 1;



        // Ensure max_pumps is at least 1 to avoid division by zero
        if (max_pumps < 1) {
            max_pumps = 1;
        }
        // Ensure num_trials is at least 1 to avoid zero trials
        if (num_trials < 1) {
            num_trials = 1;
        }

        // Ensure min_pumps is at least 1 to avoid zero pumps
        if (min_pumps < 1) {
            min_pumps = 1;
        }


        function getBalloonStyle(pump_count) {
            // Use fixed max sizes to prevent overflow and shifts
            const maxBalloonHeightVh = 50; // max 50% viewport height
            const baseHeightPx = 100;
            const growthPerPumpPx = 10; // less aggressive growth to prevent overflow
            
            // Calculate height capped at maxBalloonHeightVh of viewport height
            const maxBalloonHeightPx = window.innerHeight * (maxBalloonHeightVh / 100);
            const estimatedHeightPx = baseHeightPx + pump_count * growthPerPumpPx;
            const finalHeightPx = Math.min(estimatedHeightPx, maxBalloonHeightPx);
            
            // Scale capped to avoid huge transforms
            const scale = 1 + pump_count * 0.02; // slower scale growth
            const cappedScale = Math.min(scale, 1.5);

            return `
                height: ${finalHeightPx}px;
                transform: scale(${cappedScale});
                transform-origin: bottom center;
                width: auto;
            `;
        }


        const welcome = {
            type: jsPsychHtmlButtonResponse,
            stimulus: '<h2>Bart Experiment</h2><p>Click the button to continue.</p>',
            choices: ['Continue']
        };
        timeline.push(welcome);

        const instructions = {
            type: jsPsychHtmlButtonResponse,
            stimulus:`
            <h1>Balloon Analog Risk Task (BART)</h1>
            <p>In this task, you will inflate a balloon to earn money.</p>
            <p>Click <strong>Pump</strong> to inflate the balloon and earn <strong>${USDollar.format(.01*currency_unit_per_pump)}</strong> per pump.</p>
            <p>Click <strong>Collect</strong> to save your money and end the round.</p>
            <p>If the balloon pops, you lose the money for that round!</p>
            <p>Click below to start the task.</p>
            `,
            choices: ['Start']
        };
        timeline.push(instructions);

           for (let trial = 0; trial < num_trials; trial++) {
      const explosion_range = max_pumps - min_pumps;
      const explosion_point = Math.floor(Math.random() * explosion_range) + min_pumps;
      //const explosion_point = 55;
     let pump_count = 0;
     let balloon_popped = false;
     let cashed_out = false;

const pump_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => {
    const style = getBalloonStyle(pump_count);
    return `
      <div class="bart-container">
        <div class="balloon-area">
          <img src="img/transparent_balloon.png" style="${style}" />
        </div>
      </div>
    `;
  },
  choices: ['Pump', 'Collect'],
  on_load: () => {
    // Remove old earnings-text if any
    const oldEarnings = document.querySelector('.earnings-text');
    if (oldEarnings) oldEarnings.remove();

    const earningsText = document.createElement('div');
    earningsText.className = 'earnings-text';
    earningsText.innerHTML = `Possible earnings this round: <strong>${USDollar.format(pump_count * currency_unit_per_pump)}</strong>`;

    const content = document.querySelector('.jspsych-content');
    if (content) {
      content.appendChild(earningsText);
    }
  },
  on_finish: data => {
    if (data.response === 0) {
      pump_count++;
      if (pump_count >= explosion_point) {
        balloon_popped = true;
      }
    } else if (data.response === 1) {
      cashed_out = true;
    }
  }
};

const pump_loop = {
  timeline: [pump_trial],
  loop_function: () => {
    return !balloon_popped && !cashed_out;
  }
};


     const outcome = {
       type: jsPsychHtmlButtonResponse,
       stimulus: () => {
         const style = getBalloonStyle(pump_count);
         if (balloon_popped) {
           return `
<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; text-align: center;">
                <div class="bart-container">
               <div class="balloon-area">
                 <img src="img/transparent_popped_balloon.png" style="${style}" />
               </div>
             </div>
               <div style="text-align: center; max-width: 600px;">
                 <p><strong>POP!</strong> The balloon exploded. You earned <strong>${USDollar.format(0)}</strong> this round.</p>
                 <p>Total earnings across all rounds: <strong>${USDollar.format(.01* jsPsych.data.get().filter({ task: 'bart', exploded: false, cashed_out: true }).select('pump_count').sum())}</strong></p>
               </div>
             </div>
           `;
         } else {
           const total_points = pump_count + jsPsych.data.get().filter({ task: 'bart', exploded: false, cashed_out: true }).select('pump_count').sum();
           console.log('Total points:', total_points);
           console.log('Pump count:', pump_count);
           const total_money = total_points * currency_unit_per_pump;
           console.log('Total money:', total_money);
           return `
             <p>You collected <strong>${USDollar.format(.01*pump_count)}</strong> this round.</p>
             <p>Total earnings across all rounds: <strong>${USDollar.format(total_money)}</strong></p>
           `;
         }
       },
       choices: ['Continue'],
       on_finish: data => {
         data.task = 'bart';
         data.trial_num = trial + 1;
         data.pump_count = pump_count;
         data.exploded = balloon_popped;
         data.cashed_out = cashed_out;
       }
     };

     timeline.push(pump_loop, outcome);
   }

   const recap = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
           return `
             <p>Thank you for participating.</p>
             <p>Total earnings across all rounds: <strong>${USDollar.format(currency_unit_per_pump*jsPsych.data.get().filter({ task: 'bart', exploded: false, cashed_out: true }).select('pump_count').sum())}</strong></p>
           `;
    },
    choices: ['Finish']

   }
   timeline.push(recap);
       
       
        return timeline;
    }
   
    // Register this experiment
    if (window.ExperimentLoader) {
        window.ExperimentLoader.register('bart', {
            run: run
        });
    }
   
})();